import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getElevenLabsClient } from "./elevenlabs";
import { SYNTHESIS_CONFIG, getVoiceProfile } from "./voice-registry";
import { getVoiceSettings } from "./voice-settings";
import type { DialogueTurn, EmotionTag, Speaker } from "./types";

export interface SynthesisResult {
  turnIndex: number;
  speaker: Speaker;
  filePath: string;
  characterCount: number;
  durationEstimate: number;
  emotion: EmotionTag;
  stageDirection?: string;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

async function readWebStream(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (value) {
      chunks.push(value);
    }
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

async function readAsyncIterable(stream: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function audioToBuffer(audio: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(audio)) {
    return audio;
  }

  if (audio instanceof Uint8Array) {
    return Buffer.from(audio);
  }

  if (audio instanceof ArrayBuffer) {
    return Buffer.from(audio);
  }

  if (
    typeof audio === "object" &&
    audio !== null &&
    "getReader" in audio &&
    typeof (audio as ReadableStream<Uint8Array>).getReader === "function"
  ) {
    return readWebStream(audio as ReadableStream<Uint8Array>);
  }

  if (
    typeof audio === "object" &&
    audio !== null &&
    Symbol.asyncIterator in audio
  ) {
    return readAsyncIterable(audio as AsyncIterable<Uint8Array>);
  }

  throw new Error("Unsupported ElevenLabs audio response type.");
}

function estimateDurationSeconds(byteLength: number): number {
  const bytesPerSecond = (SYNTHESIS_CONFIG.bitrateKbps * 1000) / 8;
  return byteLength / bytesPerSecond;
}

export async function synthesizeTurn(
  turn: DialogueTurn,
  turnIndex: number,
  outputDir: string,
): Promise<SynthesisResult> {
  const voiceProfile = getVoiceProfile(turn.speaker);
  const voiceSettings = getVoiceSettings(turn.emotion, turn.speaker);
  const fileName = `turn_${String(turnIndex).padStart(3, "0")}_${turn.speaker}${SYNTHESIS_CONFIG.fileExtension}`;
  const filePath = path.join(outputDir, fileName);

  await mkdir(outputDir, { recursive: true });

  const audio = await getElevenLabsClient().textToSpeech.convert(voiceProfile.voiceId, {
    text: turn.text,
    modelId: voiceProfile.modelId,
    outputFormat: voiceProfile.outputFormat,
    voiceSettings: {
      stability: voiceSettings.stability,
      similarityBoost: voiceSettings.similarityBoost,
      style: voiceSettings.style,
      useSpeakerBoost: voiceSettings.useSpeakerBoost,
    },
  });

  const buffer = await audioToBuffer(audio);

  if (buffer.length < 1000) {
    throw new Error(
      `Turn ${turnIndex} produced suspiciously small audio output (${buffer.length} bytes).`,
    );
  }

  await writeFile(filePath, buffer);

  return {
    turnIndex,
    speaker: turn.speaker,
    filePath: toPosixPath(filePath),
    characterCount: turn.text.length,
    durationEstimate: estimateDurationSeconds(buffer.length),
    emotion: turn.emotion,
    stageDirection: turn.stage_direction,
  };
}