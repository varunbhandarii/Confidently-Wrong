import { NextRequest, NextResponse } from "next/server";

import { config } from "@/lib/config";
import { publishAllPending, publishEpisode } from "@/lib/publisher";

export async function POST(request: NextRequest) {
  let body: { password?: string; episodeId?: string };

  try {
    body = (await request.json()) as { password?: string; episodeId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.password !== config.app.adminPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const published = body.episodeId ? [await publishEpisode(body.episodeId)] : await publishAllPending();

    return NextResponse.json({
      success: true,
      feedUrl: `${config.app.baseUrl}/feed.xml`,
      published,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Publishing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
