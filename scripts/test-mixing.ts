import { loadEnvConfig } from "@next/env";

type DatabaseClient = typeof import("../src/lib/db")["db"];

loadEnvConfig(process.cwd());

async function getNextEpisodeNumber(db: DatabaseClient) {
  const latestEpisode = await db.episode.findFirst({
    orderBy: {
      episodeNumber: "desc",
    },
    select: {
      episodeNumber: true,
    },
  });

  return (latestEpisode?.episodeNumber ?? 0) + 1;
}

async function main() {
  const topic = process.argv[2]?.trim() || "Should pigeons have civil rights?";
  const shouldPublish = !process.argv.includes("--no-publish");

  const [
    { db },
    { generateScript },
    { synthesizeEpisode },
    { generateEpisodeSFX },
    { assembleEpisode },
    { getCreditStatus },
    { publishEpisode },
  ] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/llm"),
    import("../src/lib/synthesis-orchestrator"),
    import("../src/lib/sfx-pipeline"),
    import("../src/lib/episode-assembler"),
    import("../src/lib/credit-tracker"),
    import("../src/lib/publisher"),
  ]);

  console.log("1. Generating script...");
  const script = await generateScript(topic);
  console.log(`   \"${script.episode_title}\"`);

  const episodeNumber = await getNextEpisodeNumber(db);
  const episode = await db.episode.create({
    data: {
      episodeNumber,
      topicTitle: topic,
      scriptJson: JSON.stringify(script),
      showNotes: script.show_notes,
      status: "scripting",
    },
  });

  console.log("\n2. Synthesizing dialogue...");
  const synthesis = await synthesizeEpisode(script, episode.id);

  await db.episode.update({
    where: { id: episode.id },
    data: { charactersUsed: synthesis.totalCharacters, status: "synthesizing" },
  });

  console.log("\n3. Generating SFX...");
  const sfx = await generateEpisodeSFX(script, episode.id);

  console.log("\n4. Assembling episode...");
  const result = await assembleEpisode(episode.id, script, synthesis, sfx);

  console.log(`\n${"=".repeat(50)}`);
  console.log("EPISODE COMPLETE");
  console.log("=".repeat(50));
  console.log(`  File: ${result.finalPath}`);
  console.log(`  Duration: ${result.durationSeconds.toFixed(1)}s (${(result.durationSeconds / 60).toFixed(1)} min)`);
  console.log(`  Size: ${(result.fileSizeBytes / 1024).toFixed(0)} KB`);
  console.log(`  Segments: ${result.segmentCount}`);
  console.log(`  Meme: ${result.meme?.localPath ?? "not generated"}`);

  if (shouldPublish) {
    console.log("\n5. Publishing episode...");
    const published = await publishEpisode(episode.id);
    console.log(`  Published: EP ${String(published.episodeNumber).padStart(3, "0")} - ${published.title}`);
    console.log(`  Feed: ${published.feedUrl}`);
  } else {
    console.log("\n5. Publish skipped (--no-publish)");
  }

  const credits = await getCreditStatus();
  console.log(`\n  Credits: ${credits.used.toLocaleString()} / ${credits.budget.toLocaleString()} (${credits.percentUsed}% used)`);
  console.log(`\nPlay it:\n  ${result.finalPath}`);

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error("Mixing test failed:", error);

  const { db } = await import("../src/lib/db");
  await db.$disconnect();
  process.exit(1);
});
