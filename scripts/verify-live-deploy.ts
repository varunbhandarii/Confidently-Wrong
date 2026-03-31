function normalizeBaseUrl(rawValue: string): string {
  const trimmed = rawValue.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("Pass a full URL like https://your-app.replit.app");
  }
  return trimmed;
}

async function expectOk(url: string, label: string): Promise<Response> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`${label} returned ${response.status}`);
  }
  return response;
}

interface EpisodeApiEntry {
  audioUrl: string | null;
  memeUrl?: string | null;
}

async function main() {
  const rawBaseUrl = process.argv[2] || process.env.BASE_URL;

  if (!rawBaseUrl) {
    throw new Error("Usage: npm run deploy:verify -- https://your-app.replit.app");
  }

  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  const failures: string[] = [];
  let latestAudioUrl: string | null = null;
  let latestMemeUrl: string | null = null;

  async function runCheck(label: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`PASS ${label}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      failures.push(`${label}: ${message}`);
      console.error(`FAIL ${label}: ${message}`);
    }
  }

  await runCheck("Homepage loads", async () => {
    const response = await expectOk(baseUrl, "Homepage");
    const html = await response.text();
    if (!html.includes("Confidently Wrong")) {
      throw new Error("Homepage HTML does not contain the app title.");
    }
  });

  await runCheck("Admin page loads", async () => {
    const response = await expectOk(`${baseUrl}/admin`, "Admin page");
    const html = await response.text();
    if (!html.includes("Control Room")) {
      throw new Error("Admin page did not render the control room UI.");
    }
  });

  await runCheck("Status API responds", async () => {
    const response = await expectOk(`${baseUrl}/api/status`, "Status API");
    await response.json();
  });

  await runCheck("Feed is valid and points to live domain", async () => {
    const response = await expectOk(`${baseUrl}/feed.xml`, "Feed");
    const xml = await response.text();
    if (!xml.includes("<rss") || !xml.includes(baseUrl)) {
      throw new Error("Feed did not include RSS XML or the live base URL.");
    }
    if (/localhost|127\.0\.0\.1/i.test(xml)) {
      throw new Error("Feed still contains localhost URLs.");
    }
  });

  await runCheck("Artwork loads", async () => {
    await expectOk(`${baseUrl}/images/podcast-cover.jpg`, "Artwork");
  });

  await runCheck("Published episodes API returns data", async () => {
    const response = await expectOk(`${baseUrl}/api/episodes`, "Episodes API");
    const payload = (await response.json()) as EpisodeApiEntry[];
    const latestEpisode = payload[0] ?? null;
    if (!latestEpisode) {
      throw new Error("No published episodes were returned.");
    }
    latestAudioUrl = latestEpisode.audioUrl;
    latestMemeUrl = latestEpisode.memeUrl ?? null;
  });

  if (latestAudioUrl) {
    const resolvedAudioUrl = new URL(latestAudioUrl, baseUrl).toString();
    await runCheck("Latest episode audio loads", async () => {
      await expectOk(resolvedAudioUrl, "Latest episode audio");
    });
  }

  if (latestMemeUrl) {
    const resolvedMemeUrl = new URL(latestMemeUrl, baseUrl).toString();
    await runCheck("Latest episode meme loads", async () => {
      await expectOk(resolvedMemeUrl, "Latest episode meme");
    });
  }

  if (failures.length > 0) {
    console.error("\nLive deployment verification failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("\nLive deployment verification passed.");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
