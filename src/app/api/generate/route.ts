import { NextRequest, NextResponse } from "next/server";

import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { assembleEpisode } from "@/lib/episode-assembler";
import { getRandomTopic } from "@/lib/fallback-topics";
import { generateScript } from "@/lib/llm";
import { calculateCharacterBudget } from "@/lib/script-validator";
import { generateEpisodeSFX } from "@/lib/sfx-pipeline";
import { synthesizeEpisode } from "@/lib/synthesis-orchestrator";

function sanitizeTopic(value: unknown): string | null {
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

export async function POST(req: NextRequest) {
  let body: { password?: string; topic?: string };

  try {
    body = (await req.json()) as { password?: string; topic?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.password !== config.app.adminPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let selectedTopicId: string | null = null;
  let topic = sanitizeTopic(body.topic);
  let episodeId: string | null = null;

  try {
    if (!topic) {
      const topTopic = await db.topic.findFirst({
        where: { status: "pending" },
        orderBy: [{ votes: "desc" }, { createdAt: "asc" }],
      });

      if (topTopic) {
        topic = topTopic.title;
        selectedTopicId = topTopic.id;
      } else {
        topic = getRandomTopic();
      }
    }

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
        status: "scripting",
      },
    });

    const synthesis = await synthesizeEpisode(script, episode.id);
    await db.episode.update({
      where: { id: episode.id },
      data: {
        charactersUsed: synthesis.totalCharacters,
        status: "synthesizing",
      },
    });

    const sfx = await generateEpisodeSFX(script, episode.id);
    const assembly = await assembleEpisode(episode.id, script, synthesis, sfx);

    return NextResponse.json({
      success: true,
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
      status: "mixing",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Episode generation failed:", error);

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

    return NextResponse.json(
      {
        error: "Episode generation failed",
        details: message,
      },
      { status: 500 },
    );
  }
}
