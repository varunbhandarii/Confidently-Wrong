import { generateFeedXml } from "@/lib/rss-generator";
import {
  getCachedFeed,
  getFeedCacheTtlMs,
  getStaleFeed,
  setFeedCache,
} from "@/lib/feed-cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function createFeedResponse(xml: string, cacheStatus: "HIT" | "MISS" | "STALE", status = 200): Response {
  return new Response(xml, {
    status,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": `public, max-age=${Math.floor(getFeedCacheTtlMs() / 1000)}, s-maxage=${Math.floor(getFeedCacheTtlMs() / 1000)}`,
      "X-Feed-Cache": cacheStatus,
    },
  });
}

export async function GET(): Promise<Response> {
  const cachedFeed = getCachedFeed();
  if (cachedFeed) {
    return createFeedResponse(cachedFeed, "HIT");
  }

  try {
    const xml = await generateFeedXml();
    setFeedCache(xml);
    return createFeedResponse(xml, "MISS");
  } catch (error) {
    console.error("Failed to generate podcast feed:", error);

    const staleFeed = getStaleFeed();
    if (staleFeed) {
      return createFeedResponse(staleFeed, "STALE", 200);
    }

    return new Response("Failed to generate feed.", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
