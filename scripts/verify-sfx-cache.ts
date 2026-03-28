import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const sourceEpisodeId = process.argv[2]?.trim();

  if (!sourceEpisodeId) {
    throw new Error("Usage: npm run verify:sfx-cache -- <episode-id>");
  }

  const [{ db }, { generateEpisodeSFX }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/sfx-pipeline"),
  ]);

  const episode = await db.episode.findUnique({
    where: {
      id: sourceEpisodeId,
    },
    select: {
      id: true,
      topicTitle: true,
      scriptJson: true,
    },
  });

  if (!episode) {
    throw new Error(`Episode not found: ${sourceEpisodeId}`);
  }

  const script = JSON.parse(episode.scriptJson) as Parameters<typeof generateEpisodeSFX>[0];
  const verificationEpisodeId = `${episode.id}-cache-check`;

  console.log(`Replaying cached SFX for: ${episode.topicTitle}`);
  const manifest = await generateEpisodeSFX(script, verificationEpisodeId);

  console.log(`Cache hits used: ${manifest.totalCacheHits}`);
  console.log(`Newly generated: ${manifest.totalGenerated}`);
  console.log(`Manifest: ${manifest.manifestPath}`);

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error("SFX cache verification failed:", error);

  const { db } = await import("../src/lib/db");
  await db.$disconnect();
  process.exit(1);
});
