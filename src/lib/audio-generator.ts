import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getElevenLabsClient } from "./elevenlabs";
import { REUSABLE_ASSETS, type AudioAssetPrompt } from "./audio-prompts";
import {
  getCachedAudio,
  hashPrompt,
  registerAudioAsset,
  saveToCache,
  type CachedAudioType,
  type PromptHashOptions,
} from "./audio-cache";

const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128" as const;
const DEFAULT_SFX_MODEL_ID = "eleven_text_to_sound_v2";
const DEFAULT_MUSIC_MODEL_ID = "music_v1";

export interface MusicGenerationOptions {
  episodeId?: string;
  forceInstrumental?: boolean;
  outputFormat?: typeof DEFAULT_OUTPUT_FORMAT;
  durationSeconds?: number;
  modelId?: "music_v1";
}

export interface SoundEffectGenerationOptions {
  cacheType?: Extract<CachedAudioType, "sfx" | "transition">;
  episodeId?: string;
  durationSeconds?: number;
  loop?: boolean;
  outputFormat?: typeof DEFAULT_OUTPUT_FORMAT;
  promptInfluence?: number;
  modelId?: string;
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

  if (typeof audio === "object" && audio !== null && Symbol.asyncIterator in audio) {
    return readAsyncIterable(audio as AsyncIterable<Uint8Array>);
  }

  throw new Error("Unsupported ElevenLabs audio response type.");
}

async function validateAndStoreAudio(args: {
  prompt: string;
  cacheType: CachedAudioType;
  buffer: Buffer;
  hashOptions: PromptHashOptions;
  assetType: "jingle" | "sfx" | "transition";
  episodeId?: string;
}): Promise<string> {
  if (args.buffer.length < 1000) {
    throw new Error(`Generated audio was suspiciously small (${args.buffer.length} bytes).`);
  }

  const promptHash = hashPrompt(args.prompt, args.cacheType, args.hashOptions);
  const filePath = await saveToCache(args.prompt, args.cacheType, args.buffer, args.hashOptions);
  await registerAudioAsset({
    type: args.assetType,
    promptHash,
    filePath,
    episodeId: args.episodeId,
  });

  return filePath;
}

export async function generateMusic(
  prompt: string,
  options: MusicGenerationOptions = {},
): Promise<string> {
  const hashOptions: PromptHashOptions = {
    durationSeconds: options.durationSeconds,
    forceInstrumental: options.forceInstrumental ?? true,
    modelId: options.modelId ?? DEFAULT_MUSIC_MODEL_ID,
    outputFormat: options.outputFormat ?? DEFAULT_OUTPUT_FORMAT,
  };
  const cached = getCachedAudio(prompt, "jingle", hashOptions);

  if (cached) {
    await registerAudioAsset({
      type: "jingle",
      promptHash: hashPrompt(prompt, "jingle", hashOptions),
      filePath: cached,
      episodeId: options.episodeId,
    });
    console.log(`  [cache hit] jingle: ${cached}`);
    return cached;
  }

  console.log(`  [generating] jingle: "${prompt.slice(0, 60)}${prompt.length > 60 ? "..." : ""}"`);

  const audio = await getElevenLabsClient().music.compose({
    prompt,
    outputFormat: options.outputFormat ?? DEFAULT_OUTPUT_FORMAT,
    musicLengthMs: options.durationSeconds ? Math.round(options.durationSeconds * 1000) : undefined,
    modelId: options.modelId ?? DEFAULT_MUSIC_MODEL_ID,
    forceInstrumental: options.forceInstrumental ?? true,
  });

  const buffer = await audioToBuffer(audio);
  return validateAndStoreAudio({
    prompt,
    cacheType: "jingle",
    buffer,
    hashOptions,
    assetType: "jingle",
    episodeId: options.episodeId,
  });
}

export async function generateSFX(
  prompt: string,
  options: SoundEffectGenerationOptions = {},
): Promise<string> {
  const cacheType = options.cacheType ?? "sfx";
  const hashOptions: PromptHashOptions = {
    durationSeconds: options.durationSeconds,
    loop: options.loop,
    modelId: options.modelId ?? DEFAULT_SFX_MODEL_ID,
    outputFormat: options.outputFormat ?? DEFAULT_OUTPUT_FORMAT,
    promptInfluence: options.promptInfluence,
  };
  const cached = getCachedAudio(prompt, cacheType, hashOptions);

  if (cached) {
    await registerAudioAsset({
      type: cacheType === "transition" ? "transition" : "sfx",
      promptHash: hashPrompt(prompt, cacheType, hashOptions),
      filePath: cached,
      episodeId: options.episodeId,
    });
    console.log(`  [cache hit] ${cacheType}: ${cached}`);
    return cached;
  }

  console.log(`  [generating] ${cacheType}: "${prompt.slice(0, 60)}${prompt.length > 60 ? "..." : ""}"`);

  const audio = await getElevenLabsClient().textToSoundEffects.convert({
    text: prompt,
    durationSeconds: options.durationSeconds,
    loop: options.loop,
    modelId: options.modelId ?? DEFAULT_SFX_MODEL_ID,
    outputFormat: options.outputFormat ?? DEFAULT_OUTPUT_FORMAT,
    promptInfluence: options.promptInfluence,
  });

  const buffer = await audioToBuffer(audio);
  return validateAndStoreAudio({
    prompt,
    cacheType,
    buffer,
    hashOptions,
    assetType: cacheType === "transition" ? "transition" : "sfx",
    episodeId: options.episodeId,
  });
}

export async function generateTransition(
  prompt: string,
  options: Omit<SoundEffectGenerationOptions, "cacheType"> = {},
): Promise<string> {
  return generateSFX(prompt, {
    ...options,
    cacheType: "transition",
  });
}

export async function generateReusableAsset(asset: AudioAssetPrompt): Promise<string> {
  if (asset.generator === "music") {
    return generateMusic(asset.prompt, {
      durationSeconds: asset.durationSeconds,
      forceInstrumental: asset.forceInstrumental,
    });
  }

  return generateTransition(asset.prompt, {
    durationSeconds: asset.durationSeconds,
    promptInfluence: asset.promptInfluence,
  });
}

export async function ensureReusableAssets(): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  for (const asset of REUSABLE_ASSETS) {
    results[asset.id] = await generateReusableAsset(asset);
  }

  return results;
}

export async function writeEpisodeManifest(
  episodeId: string,
  fileName: string,
  payload: unknown,
): Promise<string> {
  const outputDir = path.join("public", "audio", "episodes", episodeId);
  await mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, fileName);
  await writeFile(filePath, JSON.stringify(payload, null, 2));
  return toPosixPath(filePath);
}

