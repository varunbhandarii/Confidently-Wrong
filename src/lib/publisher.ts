import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { config } from "./config";
import { db } from "./db";
import { invalidateFeedCache, setFeedCache } from "./feed-cache";
import { getAudioDuration } from "./audio-mixer";
import { generateFeedXml } from "./rss-generator";

export interface PublishResult {
  episodeId: string;
  episodeNumber: number;
  title: string;
  audioUrl: string;
  feedUrl: string;
  publishedAt: Date;
}

function getAudioPath(audioUrl: string): string {
  // Strip /api prefix — files live under public/audio/ and public/images/
  const trimmed = audioUrl.replace(/^\/api\//, "/").replace(/^\//, "");
  return path.join(process.cwd(), "public", trimmed);
}

function getEpisodeTitle(topicTitle: string, scriptJson: string): string {
  try {
    const parsed = JSON.parse(scriptJson) as { episode_title?: unknown };
    if (typeof parsed.episode_title === "string" && parsed.episode_title.trim()) {
      return parsed.episode_title.trim();
    }
  } catch {
    // Fall back to topic title when script JSON is unavailable.
  }

  return topicTitle;
}

async function refreshFeedCache(): Promise<void> {
  invalidateFeedCache();
  const xml = await generateFeedXml();
  setFeedCache(xml);
}

export async function publishEpisode(episodeId: string): Promise<PublishResult> {
  const episode = await db.episode.findUnique({
    where: { id: episodeId },
  });

  if (!episode) {
    throw new Error(`Episode ${episodeId} not found.`);
  }

  if (episode.status === "published") {
    return {
      episodeId: episode.id,
      episodeNumber: episode.episodeNumber,
      title: getEpisodeTitle(episode.topicTitle, episode.scriptJson),
      audioUrl: new URL(episode.audioUrl || "/", config.app.baseUrl).toString(),
      feedUrl: `${config.app.baseUrl}/feed.xml`,
      publishedAt: episode.publishedAt ?? episode.createdAt,
    };
  }

  if (episode.status !== "mixing") {
    throw new Error(`Episode ${episode.episodeNumber} is not ready to publish from status ${episode.status}.`);
  }

  if (!episode.audioUrl) {
    throw new Error(`Episode ${episode.episodeNumber} is missing an audio URL.`);
  }

  const audioPath = getAudioPath(episode.audioUrl);
  if (!existsSync(audioPath)) {
    throw new Error(`Audio file not found at ${audioPath}.`);
  }

  const audioSizeBytes = statSync(audioPath).size;
  const durationSeconds = Math.round(getAudioDuration(audioPath));
  const publishedAt = new Date();

  await db.episode.update({
    where: { id: episode.id },
    data: {
      status: "published",
      publishedAt,
      audioSizeBytes,
      durationSeconds,
    },
  });

  const selectedTopic = await db.topic.findFirst({
    where: {
      title: episode.topicTitle,
      status: "selected",
    },
    orderBy: { createdAt: "asc" },
  });

  if (selectedTopic) {
    await db.topic.update({
      where: { id: selectedTopic.id },
      data: { status: "used" },
    });
  }

  await refreshFeedCache();

  return {
    episodeId: episode.id,
    episodeNumber: episode.episodeNumber,
    title: getEpisodeTitle(episode.topicTitle, episode.scriptJson),
    audioUrl: new URL(episode.audioUrl, config.app.baseUrl).toString(),
    feedUrl: `${config.app.baseUrl}/feed.xml`,
    publishedAt,
  };
}

export async function publishAllPending(): Promise<PublishResult[]> {
  const pendingEpisodes = await db.episode.findMany({
    where: { status: "mixing" },
    orderBy: [{ createdAt: "asc" }, { episodeNumber: "asc" }],
    select: { id: true },
  });

  const results: PublishResult[] = [];

  for (const episode of pendingEpisodes) {
    const result = await publishEpisode(episode.id);
    results.push(result);
  }

  return results;
}
