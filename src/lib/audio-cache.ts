import { existsSync } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { db } from "./db";
import type { AudioAssetType } from "./types";

export type CachedAudioType = "sfx" | "jingle" | "transition";

export interface PromptHashOptions {
  durationSeconds?: number;
  forceInstrumental?: boolean;
  loop?: boolean;
  modelId?: string;
  outputFormat?: string;
  promptInfluence?: number;
}

const CACHE_BASE_DIR = path.join("public", "audio", "assets");
const CACHE_DIRECTORIES: Record<CachedAudioType, string> = {
  sfx: path.join(CACHE_BASE_DIR, "sfx"),
  jingle: path.join(CACHE_BASE_DIR, "jingles"),
  transition: path.join(CACHE_BASE_DIR, "transitions"),
};

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeOptions(options: PromptHashOptions): PromptHashOptions {
  const filteredEntries = Object.entries(options)
    .filter(([, value]) => value !== undefined)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  return Object.fromEntries(filteredEntries) as PromptHashOptions;
}

export function hashPrompt(
  prompt: string,
  type: CachedAudioType,
  options: PromptHashOptions = {},
): string {
  const payload = JSON.stringify({
    type,
    prompt: normalizePrompt(prompt),
    options: normalizeOptions(options),
  });

  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function getCacheDir(type: CachedAudioType): string {
  return CACHE_DIRECTORIES[type];
}

export function getCachePath(
  prompt: string,
  type: CachedAudioType,
  options: PromptHashOptions = {},
): string {
  const hash = hashPrompt(prompt, type, options);
  return path.join(getCacheDir(type), `${hash}.mp3`);
}

export function getCachedAudio(
  prompt: string,
  type: CachedAudioType,
  options: PromptHashOptions = {},
): string | null {
  const filePath = getCachePath(prompt, type, options);
  return existsSync(filePath) ? toPosixPath(filePath) : null;
}

export async function saveToCache(
  prompt: string,
  type: CachedAudioType,
  audioBuffer: Buffer,
  options: PromptHashOptions = {},
): Promise<string> {
  const filePath = getCachePath(prompt, type, options);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, audioBuffer);
  return toPosixPath(filePath);
}

export async function registerAudioAsset(args: {
  type: AudioAssetType;
  promptHash: string;
  filePath: string;
  episodeId?: string | null;
}): Promise<void> {
  const existing = await db.audioAsset.findFirst({
    where: {
      type: args.type,
      promptHash: args.promptHash,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return;
  }

  let safeEpisodeId: string | null = null;

  if (args.episodeId) {
    const episode = await db.episode.findUnique({
      where: {
        id: args.episodeId,
      },
      select: {
        id: true,
      },
    });

    safeEpisodeId = episode?.id ?? null;
  }

  await db.audioAsset.create({
    data: {
      type: args.type,
      promptHash: args.promptHash,
      filePath: args.filePath,
      episodeId: safeEpisodeId,
    },
  });
}

async function countDirectory(dir: string): Promise<{ count: number; size: number }> {
  if (!existsSync(dir)) {
    return { count: 0, size: 0 };
  }

  const files = (await readdir(dir)).filter((file) => file.endsWith(".mp3"));
  const sizes = await Promise.all(files.map(async (file) => stat(path.join(dir, file))));

  return {
    count: files.length,
    size: sizes.reduce((sum, fileStat) => sum + fileStat.size, 0),
  };
}

export async function getCacheStats(): Promise<{
  sfx: number;
  jingles: number;
  transitions: number;
  totalSizeBytes: number;
}> {
  const [sfx, jingles, transitions] = await Promise.all([
    countDirectory(CACHE_DIRECTORIES.sfx),
    countDirectory(CACHE_DIRECTORIES.jingle),
    countDirectory(CACHE_DIRECTORIES.transition),
  ]);

  return {
    sfx: sfx.count,
    jingles: jingles.count,
    transitions: transitions.count,
    totalSizeBytes: sfx.size + jingles.size + transitions.size,
  };
}

