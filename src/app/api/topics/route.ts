import { NextRequest, NextResponse } from "next/server";

import { findDuplicatePendingTopic, getPendingTopics, hashRequesterIp } from "@/lib/app-data";
import { db } from "@/lib/db";

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function getRequesterIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
}

export async function GET() {
  return NextResponse.json(await getPendingTopics());
}

export async function POST(request: NextRequest) {
  let body: { title?: string; description?: string };

  try {
    body = (await request.json()) as { title?: string; description?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = sanitizeText(body.title, 100);
  const description = sanitizeText(body.description, 300) || null;

  if (title.length < 3) {
    return NextResponse.json({ error: "Topic too short. Use at least 3 characters." }, { status: 400 });
  }

  const requesterHash = hashRequesterIp(getRequesterIp(request));
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentSubmissions = await db.topic.count({
    where: {
      submittedByIp: requesterHash,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentSubmissions >= 5) {
    return NextResponse.json({ error: "Rate limited. Max 5 per hour." }, { status: 429 });
  }

  const duplicate = await findDuplicatePendingTopic(title);
  if (duplicate) {
    const updated = await db.topic.update({
      where: { id: duplicate.id },
      data: { votes: { increment: 1 } },
      select: {
        id: true,
        title: true,
        votes: true,
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      votes: updated.votes,
      deduped: true,
    });
  }

  const topic = await db.topic.create({
    data: {
      title,
      description,
      submittedByIp: requesterHash,
    },
    select: {
      id: true,
      title: true,
      description: true,
      votes: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    id: topic.id,
    title: topic.title,
    description: topic.description,
    votes: topic.votes,
    status: topic.status,
    createdAt: topic.createdAt.toISOString(),
  });
}

