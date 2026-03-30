import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  let body: { topicId?: string };

  try {
    body = (await request.json()) as { topicId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.topicId) {
    return NextResponse.json({ error: "topicId is required" }, { status: 400 });
  }

  try {
    const topic = await db.topic.update({
      where: { id: body.topicId },
      data: { votes: { increment: 1 } },
      select: {
        id: true,
        votes: true,
      },
    });

    return NextResponse.json(topic);
  } catch {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }
}

