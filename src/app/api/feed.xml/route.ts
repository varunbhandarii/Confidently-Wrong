import { NextResponse } from "next/server";

import { getCachedFeed, setFeedCache } from "@/lib/feed-cache";
import { generateFeedXml } from "@/lib/rss-generator";

export const dynamic = "force-dynamic";

export async function GET() {
  let xml = getCachedFeed();

  if (!xml) {
    xml = await generateFeedXml();
    setFeedCache(xml);
  }

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
