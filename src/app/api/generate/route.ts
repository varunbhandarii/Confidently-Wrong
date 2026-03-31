import { NextRequest, NextResponse } from "next/server";

import { config } from "@/lib/config";
import { generateEpisodePipeline } from "@/lib/episode-generation";

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
    const result = await generateEpisodePipeline({
      topic: body.topic,
      publish: false,
    });

    return NextResponse.json({
      success: true,
      episodeId: result.episodeId,
      episodeNumber: result.episodeNumber,
      topic: result.topic,
      title: result.title,
      sponsor: result.sponsor,
      characterBudget: result.characterBudget,
      synthesis: result.synthesis,
      assembly: result.assembly,
      memeUrl: result.memeUrl,
      status: "mixing",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Episode generation failed:", error);

    return NextResponse.json(
      {
        error: "Episode generation failed",
        details: message,
      },
      { status: 500 },
    );
  }
}
