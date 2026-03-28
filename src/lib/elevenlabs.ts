import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

import { config } from "./config";
import type { VoiceSettings } from "./types";

let client: ElevenLabsClient | undefined;

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
      useSpeakerBoost: voiceSettings?.useSpeakerBoost ?? true,
    },
  });

  await writeAudioFile(outputPath, audio);

  if (!existsSync(outputPath)) {
    throw new Error(`Expected synthesized speech file at ${outputPath}`);
  }

  return outputPath;
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