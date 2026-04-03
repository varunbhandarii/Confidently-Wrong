import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

const recentVotes = new Map<string, number[]>();
const VOTE_WINDOW_MS = 60_000;
const MAX_VOTES_PER_WINDOW = 30;

function getVoterIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || real?.trim() || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (recentVotes.get(ip) ?? []).filter((t) => now - t < VOTE_WINDOW_MS);
  recentVotes.set(ip, timestamps);

  if (timestamps.length >= MAX_VOTES_PER_WINDOW) {
    return true;
  }

  timestamps.push(now);
  return false;
}

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

  if (isRateLimited(getVoterIp(request))) {
    return NextResponse.json({ error: "Too many votes. Slow down." }, { status: 429 });
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

