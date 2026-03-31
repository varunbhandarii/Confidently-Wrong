import { createHash } from "node:crypto";

import { getCacheStats } from "./audio-cache";
import { getCreditStatus } from "./credit-tracker";
import { db } from "./db";
import type {
  PipelineEpisodeSummary,
  PipelineStatusSnapshot,
  PublicEpisodeSummary,
  PublicTopicSummary,
  SponsorSummary,
} from "./view-models";

const ACTIVE_EPISODE_STATUSES = ["scripting", "synthesizing", "mixing"] as const;
const STALE_PIPELINE_WINDOW_MS = 1000 * 60 * 45;

function normalizeTopicTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseEpisodePayload(scriptJson: string, topicTitle: string, fallbackShowNotes: string | null) {
  let title = topicTitle;
  let showNotes = fallbackShowNotes?.trim() || `Chad and Marina go all-in on ${topicTitle}.`;
  let sponsor: SponsorSummary | null = null;

  try {
    const parsed = JSON.parse(scriptJson) as {
      episode_title?: unknown;
      show_notes?: unknown;
      fake_sponsor?: { name?: unknown; tagline?: unknown } | null;
    };

    if (typeof parsed.episode_title === "string" && parsed.episode_title.trim()) {
      title = parsed.episode_title.trim();
    }

    if (typeof parsed.show_notes === "string" && parsed.show_notes.trim()) {
      showNotes = parsed.show_notes.trim();
    }

    if (
      parsed.fake_sponsor &&
      typeof parsed.fake_sponsor.name === "string" &&
      typeof parsed.fake_sponsor.tagline === "string"
    ) {
      sponsor = {
        name: parsed.fake_sponsor.name.trim(),
        tagline: parsed.fake_sponsor.tagline.trim(),
      };
    }
  } catch {
    // Ignore malformed stored script JSON and keep fallbacks.
  }

  return { title, showNotes, sponsor };
}

function serializeTopic(topic: {
  id: string;
  title: string;
  description: string | null;
  votes: number;
  status: string;
  createdAt: Date;
}): PublicTopicSummary {
  return {
    id: topic.id,
    title: topic.title,
    description: topic.description,
    votes: topic.votes,
    status: topic.status,
    createdAt: topic.createdAt.toISOString(),
  };
}

function isFreshPipelineEpisode(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() <= STALE_PIPELINE_WINDOW_MS;
}

export async function getPublishedEpisodes(limit = 24): Promise<PublicEpisodeSummary[]> {
  const episodes = await db.episode.findMany({
    where: { status: "published" },
    orderBy: [{ publishedAt: "desc" }, { episodeNumber: "desc" }],
    take: limit,
    select: {
      id: true,
      episodeNumber: true,
      topicTitle: true,
      scriptJson: true,
      audioUrl: true,
      memeUrl: true,
      durationSeconds: true,
      audioSizeBytes: true,
      showNotes: true,
      publishedAt: true,
      status: true,
    },
  });

  return episodes.map((episode) => {
    const { title, showNotes, sponsor } = parseEpisodePayload(
      episode.scriptJson,
      episode.topicTitle,
      episode.showNotes,
    );

    return {
      id: episode.id,
      episodeNumber: episode.episodeNumber,
      title,
      topicTitle: episode.topicTitle,
      audioUrl: episode.audioUrl,
      memeUrl: episode.memeUrl,
      durationSeconds: episode.durationSeconds,
      audioSizeBytes: episode.audioSizeBytes,
      showNotes,
      sponsor,
      publishedAt: episode.publishedAt?.toISOString() ?? null,
      status: episode.status,
    };
  });
}

export async function getPendingTopics(limit = 12): Promise<PublicTopicSummary[]> {
  const topics = await db.topic.findMany({
    where: { status: "pending" },
    orderBy: [{ votes: "desc" }, { createdAt: "asc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      votes: true,
      status: true,
      createdAt: true,
    },
  });

  return topics.map(serializeTopic);
}

export async function getPipelineStatus(): Promise<PipelineStatusSnapshot> {
  const staleCutoff = new Date(Date.now() - STALE_PIPELINE_WINDOW_MS);
  const [generating, publishedCount, pendingTopics, pendingPublishCount, recentEpisodes, credits, cache] =
    await Promise.all([
      db.episode.findFirst({
        where: {
          status: {
            in: [...ACTIVE_EPISODE_STATUSES],
          },
          createdAt: {
            gte: staleCutoff,
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          episodeNumber: true,
          topicTitle: true,
          status: true,
          createdAt: true,
        },
      }),
      db.episode.count({ where: { status: "published" } }),
      db.topic.count({ where: { status: "pending" } }),
      db.episode.count({
        where: {
          status: "mixing",
          createdAt: {
            gte: staleCutoff,
          },
        },
      }),
      db.episode.findMany({
        orderBy: [{ createdAt: "desc" }, { episodeNumber: "desc" }],
        take: 12,
        select: {
          id: true,
          episodeNumber: true,
          topicTitle: true,
          scriptJson: true,
          status: true,
          audioUrl: true,
          durationSeconds: true,
          publishedAt: true,
          createdAt: true,
          charactersUsed: true,
        },
      }),
      getCreditStatus(),
      getCacheStats(),
    ]);

  return {
    generating: generating
      ? {
          id: generating.id,
          episodeNumber: generating.episodeNumber,
          topicTitle: generating.topicTitle,
          status: generating.status,
          createdAt: generating.createdAt.toISOString(),
        }
      : null,
    publishedCount,
    pendingTopics,
    pendingPublishCount,
    credits,
    cache,
    recentEpisodes: recentEpisodes.map<PipelineEpisodeSummary>((episode) => ({
      id: episode.id,
      episodeNumber: episode.episodeNumber,
      title: parseEpisodePayload(episode.scriptJson, episode.topicTitle, null).title,
      topicTitle: episode.topicTitle,
      status: !isFreshPipelineEpisode(episode.createdAt) && ACTIVE_EPISODE_STATUSES.includes(episode.status as (typeof ACTIVE_EPISODE_STATUSES)[number])
        ? "failed"
        : episode.status,
      audioUrl: episode.audioUrl,
      durationSeconds: episode.durationSeconds,
      publishedAt: episode.publishedAt?.toISOString() ?? null,
      createdAt: episode.createdAt.toISOString(),
      charactersUsed: episode.charactersUsed,
    })),
  };
}

export function hashRequesterIp(ipAddress: string): string {
  return createHash("sha256").update(ipAddress).digest("hex").slice(0, 24);
}

export async function findDuplicatePendingTopic(title: string) {
  const normalizedTitle = normalizeTopicTitle(title);
  const topics = await db.topic.findMany({
    where: {
      status: {
        in: ["pending", "selected"],
      },
    },
    select: {
      id: true,
      title: true,
      votes: true,
    },
  });

  return topics.find((topic) => normalizeTopicTitle(topic.title) === normalizedTitle) ?? null;
}
