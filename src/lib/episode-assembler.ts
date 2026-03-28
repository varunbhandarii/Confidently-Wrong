import { statSync } from "node:fs";
import path from "node:path";

import { db } from "./db";
import { getAudioDuration, mixEpisode } from "./audio-mixer";
import { tagEpisode } from "./id3-tagger";
import { buildSequence, printSequence } from "./segment-sequencer";
import type { SynthesisReport } from "./synthesis-orchestrator";
import type { SFXManifest } from "./sfx-pipeline";
import type { PodcastScript } from "./types";

export interface AssemblyResult {
  episodeId: string;
  finalPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
  segmentCount: number;
}

export async function assembleEpisode(
  episodeId: string,
  script: PodcastScript,
  synthesis: SynthesisReport,
  sfx: SFXManifest,
): Promise<AssemblyResult> {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Assembling: \"${script.episode_title}\"`);
  console.log("=".repeat(50));

  const plan = buildSequence(script, synthesis, sfx);
  printSequence(plan);

  const episode = await db.episode.findUnique({
    where: {
      id: episodeId,
    },
    select: {
      episodeNumber: true,
    },
  });

  const episodeNumber = episode?.episodeNumber ?? 1;
  const episodeDir = path.join("public", "audio", "episodes", episodeId);
  const mixedPath = path.join(episodeDir, "episode_mixed.mp3");
  const finalFileName = `confidently-wrong-ep${String(episodeNumber).padStart(3, "0")}.mp3`;
  const finalPath = path.join(episodeDir, finalFileName);

  mixEpisode(plan, mixedPath, episodeDir);

  console.log("\nTagging metadata...");
  tagEpisode(mixedPath, finalPath, {
    episodeNumber,
    script,
    durationSeconds: getAudioDuration(mixedPath),
  });

  const finalDurationSeconds = getAudioDuration(finalPath);
  const finalFileSizeBytes = statSync(finalPath).size;

  await db.episode.update({
    where: {
      id: episodeId,
    },
    data: {
      audioUrl: `/audio/episodes/${episodeId}/${finalFileName}`,
      audioSizeBytes: finalFileSizeBytes,
      durationSeconds: Math.round(finalDurationSeconds),
      status: "mixing",
    },
  });

  console.log(`\nAssembly complete: ${finalPath}`);
  console.log(`  Duration: ${finalDurationSeconds.toFixed(1)}s`);
  console.log(`  Size: ${(finalFileSizeBytes / 1024).toFixed(0)} KB`);

  return {
    episodeId,
    finalPath: finalPath.split(path.sep).join("/"),
    durationSeconds: finalDurationSeconds,
    fileSizeBytes: finalFileSizeBytes,
    segmentCount: plan.segments.length,
  };
}
