import { copyFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import type { AudioSegment, SequencePlan, SfxEvent } from "./segment-sequencer";

export interface MixResult {
  outputPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
  workDir: string;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function runFfmpeg(args: string[]): void {
  execFileSync("ffmpeg", ["-y", ...args], { stdio: "pipe" });
}

function runFfprobe(args: string[]): string {
  return execFileSync("ffprobe", args, { encoding: "utf8", stdio: "pipe" }).trim();
}

export function getAudioDuration(filePath: string): number {
  const output = runFfprobe([
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    path.resolve(filePath),
  ]);

  const duration = Number.parseFloat(output);
  return Number.isFinite(duration) ? duration : 0;
}

function generateSilence(durationMs: number, outputPath: string): void {
  runFfmpeg([
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=44100:cl=stereo",
    "-t",
    (durationMs / 1000).toFixed(3),
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    outputPath,
  ]);
}

function adjustVolume(inputPath: string, outputPath: string, volume: number): void {
  runFfmpeg([
    "-i",
    path.resolve(inputPath),
    "-filter:a",
    `volume=${volume}`,
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    outputPath,
  ]);
}

function normalizeAudio(inputPath: string, outputPath: string): void {
  runFfmpeg([
    "-i",
    inputPath,
    "-filter:a",
    "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    outputPath,
  ]);
}

function prepareBaseSegments(
  segments: AudioSegment[],
  mixDir: string,
): { preparedFiles: string[]; turnEndMs: Map<number, number> } {
  const preparedFiles: string[] = [];
  const turnEndMs = new Map<number, number>();
  let timelineMs = 0;

  segments.forEach((segment, index) => {
    const segmentPath = path.join(mixDir, `segment_${String(index).padStart(3, "0")}.mp3`);

    if (segment.type === "silence") {
      generateSilence(segment.durationMs ?? 400, segmentPath);
      preparedFiles.push(segmentPath);
      timelineMs += segment.durationMs ?? 400;
      return;
    }

    if (!segment.filePath) {
      throw new Error(`Expected filePath for ${segment.label}`);
    }

    if (segment.volume !== 1) {
      adjustVolume(segment.filePath, segmentPath, segment.volume);
    } else {
      copyFileSync(segment.filePath, segmentPath);
    }

    preparedFiles.push(segmentPath);
    const durationMs = Math.round(getAudioDuration(segmentPath) * 1000);
    timelineMs += durationMs;

    if (segment.type === "dialogue" && segment.turnIndex !== undefined) {
      turnEndMs.set(segment.turnIndex, timelineMs);
    }
  });

  return { preparedFiles, turnEndMs };
}

function writeConcatList(preparedFiles: string[], concatListPath: string): void {
  const lines = preparedFiles.map((filePath) => `file '${path.resolve(filePath).replace(/'/g, "'\\''")}'`);
  writeFileSync(concatListPath, lines.join("\n"), "utf8");
}

function concatenateBaseTrack(preparedFiles: string[], mixDir: string): string {
  const concatListPath = path.join(mixDir, "concat.txt");
  const outputPath = path.join(mixDir, "base-track.mp3");
  writeConcatList(preparedFiles, concatListPath);

  runFfmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    outputPath,
  ]);

  return outputPath;
}

function overlaySfx(
  baseTrackPath: string,
  sfxEvents: SfxEvent[],
  turnEndMs: Map<number, number>,
  mixDir: string,
): string {
  if (sfxEvents.length === 0) {
    return baseTrackPath;
  }

  const outputPath = path.join(mixDir, "mixed-with-sfx.mp3");
  const args: string[] = ["-i", baseTrackPath];
  const filterParts: string[] = [];
  const activeEvents = sfxEvents.filter((event) => turnEndMs.has(event.turnIndex));

  if (activeEvents.length === 0) {
    return baseTrackPath;
  }

  activeEvents.forEach((event, index) => {
    const startMs = turnEndMs.get(event.turnIndex) ?? 0;
    args.push("-i", path.resolve(event.filePath));
    filterParts.push(
      `[${index + 1}:a]volume=${event.volume},adelay=${startMs}|${startMs}[sfx${index}]`,
    );
  });

  const mixInputs = ["[0:a]", ...activeEvents.map((_, index) => `[sfx${index}]`)].join("");
  filterParts.push(`${mixInputs}amix=inputs=${activeEvents.length + 1}:normalize=0:dropout_transition=0[mixout]`);

  runFfmpeg([
    ...args,
    "-filter_complex",
    filterParts.join(";"),
    "-map",
    "[mixout]",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    outputPath,
  ]);

  return outputPath;
}

function cleanWorkDir(mixDir: string): void {
  if (existsSync(mixDir)) {
    rmSync(mixDir, { recursive: true, force: true });
  }
}

export function mixEpisode(plan: SequencePlan, outputPath: string, workDir: string): MixResult {
  const mixDir = path.join(workDir, "_mix");
  cleanWorkDir(mixDir);
  ensureDir(mixDir);
  ensureDir(path.dirname(outputPath));

  const { preparedFiles, turnEndMs } = prepareBaseSegments(plan.segments, mixDir);
  const baseTrackPath = concatenateBaseTrack(preparedFiles, mixDir);
  const mixedTrackPath = overlaySfx(baseTrackPath, plan.sfxEvents, turnEndMs, mixDir);
  const normalizedPath = path.join(mixDir, "normalized.mp3");
  normalizeAudio(mixedTrackPath, normalizedPath);
  copyFileSync(normalizedPath, outputPath);

  const durationSeconds = getAudioDuration(outputPath);
  const fileSizeBytes = statSync(outputPath).size;

  return {
    outputPath: toPosixPath(outputPath),
    durationSeconds,
    fileSizeBytes,
    workDir: toPosixPath(mixDir),
  };
}
