const FEED_CACHE_TTL_MS = 60_000;

interface FeedCacheEntry {
  xml: string;
  updatedAt: number;
}

let cacheEntry: FeedCacheEntry | null = null;

export function getFeedCacheTtlMs(): number {
  return FEED_CACHE_TTL_MS;
}

export function getCachedFeed(): string | null {
  if (!cacheEntry) {
    return null;
  }

  if (Date.now() - cacheEntry.updatedAt > FEED_CACHE_TTL_MS) {
    return null;
  }

  return cacheEntry.xml;
}

export function getStaleFeed(): string | null {
  return cacheEntry?.xml ?? null;
}

export function setFeedCache(xml: string): void {
  cacheEntry = {
    xml,
    updatedAt: Date.now(),
  };
}

export function invalidateFeedCache(): void {
  cacheEntry = null;
}
