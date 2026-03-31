import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const episodeId = process.argv[2]?.trim();

  const [{ db }, { publishEpisode }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/publisher"),
  ]);

  const targetEpisode = episodeId
    ? await db.episode.findUnique({ where: { id: episodeId }, select: { id: true } })
    : await db.episode.findFirst({
        where: { status: "mixing" },
        orderBy: [{ createdAt: "desc" }, { episodeNumber: "desc" }],
        select: { id: true },
      });

  if (!targetEpisode) {
    throw new Error(episodeId ? `Episode ${episodeId} not found.` : "No mixing episode found to publish.");
  }

  const published = await publishEpisode(targetEpisode.id);

  console.log(`Published EP ${String(published.episodeNumber).padStart(3, "0")}: ${published.title}`);
  console.log(`Audio: ${published.audioUrl}`);
  console.log(`Feed: ${published.feedUrl}`);

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  const { db } = await import("../src/lib/db");
  await db.$disconnect();
  process.exit(1);
});
