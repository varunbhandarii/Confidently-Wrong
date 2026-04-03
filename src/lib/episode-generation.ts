import { db } from "./db";
import { assembleEpisode } from "./episode-assembler";
import { getRandomTopic } from "./fallback-topics";
import { generateScript } from "./llm";
import { publishEpisode, type PublishResult } from "./publisher";
import { calculateCharacterBudget } from "./script-validator";
import { generateEpisodeSFX } from "./sfx-pipeline";
import { synthesizeEpisode } from "./synthesis-orchestrator";

let generationLock: Promise<GeneratedEpisodeResult> | null = null;

export interface GenerateEpisodeOptions {
  topic?: string;
  publish?: boolean;
}

export interface GeneratedEpisodeResult {
  episodeId: string;
  episodeNumber: number;
  topic: string;
  title: string;
  sponsor: string;
  characterBudget: ReturnType<typeof calculateCharacterBudget>;
  synthesis: {
    turnsSucceeded: number;
    turnsFailed: number;
    estimatedDurationSeconds: number;
  };
  assembly: {
    finalPath: string;
    durationSeconds: number;
    fileSizeBytes: number;
  };
  memeUrl: string | null;
  selectedTopicId: string | null;
  published: PublishResult | null;
}

function sanitizeTopic(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const topic = value.trim();
  return topic.length > 0 ? topic : null;
}

async function getNextEpisodeNumber(): Promise<number> {
  const latestEpisode = await db.episode.findFirst({
    orderBy: { episodeNumber: "desc" },
    select: { episodeNumber: true },
  });

  return (latestEpisode?.episodeNumber ?? 0) + 1;
}

async function resolveTopic(explicitTopic?: string): Promise<{ topic: string; selectedTopicId: string | null }> {
  const topicOverride = sanitizeTopic(explicitTopic);
  if (topicOverride) {
    return { topic: topicOverride, selectedTopicId: null };
  }

  const topTopic = await db.topic.findFirst({
    where: { status: "pending" },
    orderBy: [{ votes: "desc" }, { createdAt: "asc" }],
    select: { id: true, title: true },
  });

  if (topTopic) {
    return {
      topic: topTopic.title,
      selectedTopicId: topTopic.id,
    };
  }

  return {
    topic: getRandomTopic(),
    selectedTopicId: null,
  };
}

export async function generateEpisodePipeline(options: GenerateEpisodeOptions = {}): Promise<GeneratedEpisodeResult> {
  if (generationLock) {
    throw new Error("An episode is already being generated. Please wait for it to finish.");
  }

  const pipeline = runGenerationPipeline(options);
  generationLock = pipeline;

  try {
    return await pipeline;
  } finally {
    generationLock = null;
  }
}

async function runGenerationPipeline(options: GenerateEpisodeOptions): Promise<GeneratedEpisodeResult> {
  const { topic, selectedTopicId } = await resolveTopic(options.topic);

  let episodeId: string | null = null;

  try {
    const episodeNumber = await getNextEpisodeNumber();
    const episode = await db.episode.create({
      data: {
        episodeNumber,
        topicTitle: topic,
        scriptJson: "{}",
        status: "scripting",
      },
      select: {
        id: true,
        episodeNumber: true,
      },
    });

    episodeId = episode.id;

    if (selectedTopicId) {
      await db.topic.update({
        where: { id: selectedTopicId },
        data: { status: "selected" },
      });
    }

    const script = await generateScript(topic);
    const budget = calculateCharacterBudget(script);

    await db.episode.update({
      where: { id: episode.id },
      data: {
        scriptJson: JSON.stringify(script),
        showNotes: script.show_notes,
        status: "synthesizing",
      },
    });

    const synthesis = await synthesizeEpisode(script, episode.id);

    await db.episode.update({
      where: { id: episode.id },
      data: {
        charactersUsed: synthesis.totalCharacters,
        status: "mixing",
      },
    });

    const sfx = await generateEpisodeSFX(script, episode.id);
    const assembly = await assembleEpisode(episode.id, script, synthesis, sfx);
    const published = options.publish ? await publishEpisode(episode.id) : null;

    return {
      episodeId: episode.id,
      episodeNumber: episode.episodeNumber,
      topic,
      title: script.episode_title,
      sponsor: script.fake_sponsor.name,
      characterBudget: budget,
      synthesis: {
        turnsSucceeded: synthesis.results.length,
        turnsFailed: synthesis.failedTurns.length,
        estimatedDurationSeconds: synthesis.totalDurationEstimate,
      },
      assembly: {
        finalPath: assembly.finalPath,
        durationSeconds: assembly.durationSeconds,
        fileSizeBytes: assembly.fileSizeBytes,
      },
      memeUrl: assembly.meme?.publicUrl ?? null,
      selectedTopicId,
      published,
    };
  } catch (error) {
    if (episodeId) {
      await db.episode.update({
        where: { id: episodeId },
        data: { status: "failed" },
      }).catch(() => undefined);
    }

    if (selectedTopicId) {
      await db.topic.update({
        where: { id: selectedTopicId },
        data: { status: "pending" },
      }).catch(() => undefined);
    }

    throw error;
  }
}
