import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

function getArtworkDimensions(filePath: string): string | null {
  if (!existsSync(filePath) || process.platform !== "win32") {
    return null;
  }

  const escapedPath = filePath.replace(/'/g, "''");
  const command = `
Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile('${escapedPath}')
Write-Output "$($image.Width)x$($image.Height)"
$image.Dispose()
`;

  return execFileSync("powershell", ["-NoProfile", "-Command", command], {
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
}

async function main() {
  const [
    { db },
    { generateFeedXml },
    { publishAllPending },
    feedRouteModule,
    nextConfigModule,
  ] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/rss-generator"),
    import("../src/lib/publisher"),
    import("../src/app/feed.xml/route"),
    import("../next.config"),
  ]);

  console.log("1. Publishing pending episodes...");
  const published = await publishAllPending();
  console.log(`   Published: ${published.length} episodes`);

  console.log("\n2. Generating RSS feed...");
  const xml = await generateFeedXml();
  writeFileSync(path.join(process.cwd(), "test-feed.xml"), xml, "utf8");

  console.log("\n3. Exercising /feed.xml route...");
  const firstResponse = await feedRouteModule.GET();
  const firstBody = await firstResponse.text();
  const secondResponse = await feedRouteModule.GET();
  const secondBody = await secondResponse.text();

  const publishedCount = await db.episode.count({
    where: { status: "published" },
  });

  const itemCount = (xml.match(/<item>/g) || []).length;
  const artworkPath = path.join(process.cwd(), "public", "images", "podcast-cover.jpg");
  const artworkDimensions = getArtworkDimensions(artworkPath);

  const nextConfig = nextConfigModule.default;
  const headerRules = typeof nextConfig.headers === "function" ? await nextConfig.headers() : [];
  const audioHeaderRule = headerRules.find((rule) => rule.source === "/audio/:path*");
  const feedHeaderRule = headerRules.find((rule) => rule.source === "/feed.xml");

  const checks = [
    { name: "Generator returns <rss>", pass: xml.includes("<rss") },
    { name: "Has iTunes namespace", pass: xml.includes("xmlns:itunes") },
    { name: "Has <channel>", pass: xml.includes("<channel>") },
    { name: "Has podcast title", pass: xml.includes("Confidently Wrong") },
    { name: "Has itunes:image", pass: xml.includes("itunes:image") },
    { name: "Has itunes:owner", pass: xml.includes("itunes:owner") },
    { name: "Has enclosure", pass: xml.includes("<enclosure") },
    { name: "No empty enclosure URL", pass: !xml.includes('url=""') },
    { name: "No zero-byte enclosure", pass: !xml.includes('length="0"') },
    { name: "Route returns 200", pass: firstResponse.status === 200 },
    { name: "Route content type is RSS XML", pass: (firstResponse.headers.get("content-type") || "").includes("application/rss+xml") },
    { name: "Route body matches generator", pass: firstBody === xml },
    { name: "Second route response is cache hit", pass: secondResponse.headers.get("x-feed-cache") === "HIT" && secondBody === firstBody },
    { name: "Published count matches item count", pass: publishedCount === itemCount },
    { name: "Artwork exists at 3000x3000", pass: artworkDimensions === "3000x3000" },
    {
      name: "Audio headers configured",
      pass:
        audioHeaderRule?.headers.some((header) => header.key === "Accept-Ranges" && header.value === "bytes") ?? false,
    },
    {
      name: "Feed headers configured",
      pass:
        feedHeaderRule?.headers.some((header) => header.key === "Content-Type" && header.value.includes("application/rss+xml")) ?? false,
    },
  ];

  let allPassed = true;
  console.log("\n4. Validation results:");
  for (const check of checks) {
    const status = check.pass ? "PASS" : "FAIL";
    console.log(`   [${status}] ${check.name}`);
    if (!check.pass) {
      allPassed = false;
    }
  }

  console.log(`\n   Published episodes: ${publishedCount}`);
  console.log(`   Items in feed: ${itemCount}`);
  console.log(`   Artwork: ${artworkDimensions ?? "missing"}`);
  console.log("   Feed preview:");
  console.log(firstBody.slice(0, 1500));
  if (firstBody.length > 1500) {
    console.log(`   ... (${firstBody.length} total chars)`);
  }
  console.log("\n   Full feed written to test-feed.xml");

  await db.$disconnect();

  if (!allPassed) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error("Feed test failed:", error);
  const { db } = await import("../src/lib/db");
  await db.$disconnect();
  process.exit(1);
});

