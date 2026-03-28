import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { config } from "./config";
import type { VoiceSettings } from "./types";

let client: ElevenLabsClient | undefined;
let totalCharactersUsed = 0;

function getClient(): ElevenLabsClient {
  client ??= new ElevenLabsClient({
    apiKey: config.elevenlabs.apiKey,
  });

  return client;
}

async function readAudioStream(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
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

async function writeAudioFile(outputPath: string, stream: ReadableStream<Uint8Array>) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const buffer = await readAudioStream(stream);
  await writeFile(outputPath, buffer);
}

export function getCreditsUsed(): number {
  return totalCharactersUsed;
}

export function getCreditsRemaining(): number {
  return Math.max(config.app.creditBudget - totalCharactersUsed, 0);
}

export async function synthesizeSpeech(
  voiceId: string,
  text: string,
  outputPath: string,
  voiceSettings?: Partial<VoiceSettings>,
): Promise<string> {
  const audio = await getClient().textToSpeech.convert(voiceId, {
    text,
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    voiceSettings: {
      stability: voiceSettings?.stability ?? 0.5,
      similarityBoost: voiceSettings?.similarityBoost ?? 0.75,
      style: voiceSettings?.style ?? 0,
    },
  });

  await writeAudioFile(outputPath, audio);
  totalCharactersUsed += text.length;

  return outputPath;
}

export async function generateMusic(prompt: string, outputPath: string): Promise<string> {
  void prompt;
  void outputPath;
  throw new Error("Music generation is scheduled for Phase 4.");
}

export async function generateSFX(prompt: string, outputPath: string): Promise<string> {
  void prompt;
  void outputPath;
  throw new Error("Sound effect generation is scheduled for Phase 4.");
}

export async function createVoice(options: {
  name: string;
  description: string;
  sampleText: string;
  labels?: Record<string, string>;
}): Promise<string> {
  const preview = await getClient().textToVoice.createPreviews({
    outputFormat: "mp3_22050_32",
    voiceDescription: options.description,
    text: options.sampleText,
  });

  const generatedVoiceId = preview.previews[0]?.generatedVoiceId;

  if (!generatedVoiceId) {
    throw new Error(`No preview voice ID returned while creating ${options.name}.`);
  }

  const createdVoice = await getClient().textToVoice.create({
    voiceName: options.name,
    voiceDescription: options.description,
    generatedVoiceId,
    labels: options.labels,
  });

  if (!createdVoice.voiceId) {
    throw new Error(`No persistent voice ID returned while creating ${options.name}.`);
  }

  return createdVoice.voiceId;
}

export { getClient as getElevenLabsClient };
