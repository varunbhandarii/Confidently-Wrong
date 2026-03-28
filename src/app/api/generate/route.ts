import { NextRequest, NextResponse } from "next/server";

import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { getRandomTopic } from "@/lib/fallback-topics";
import { generateScript } from "@/lib/llm";
import { calculateCharacterBudget } from "@/lib/script-validator";

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

  try {
    let topic = sanitizeTopic(body.topic);
    let selectedTopicId: string | null = null;

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
    });

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
        charactersUsed: budget.total,
        showNotes: script.show_notes,
        status: "scripting",
      },
    });

    return NextResponse.json({
      success: true,
      episodeId: episode.id,
      episodeNumber,
      topic,
      title: script.episode_title,
      sponsor: script.fake_sponsor.name,
      characterBudget: budget,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Script generation failed:", error);

    return NextResponse.json(
      {
        error: "Script generation failed",
        details: message,
      },
      { status: 500 },
    );
  }
}
