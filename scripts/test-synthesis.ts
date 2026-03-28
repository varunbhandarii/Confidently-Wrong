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

  const [{ db }, { generateScript }, { synthesizeEpisode }, { getCreditStatus }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/llm"),
    import("../src/lib/synthesis-orchestrator"),
    import("../src/lib/credit-tracker"),
  ]);

  console.log("Step 1: Generating script...");
  const script = await generateScript(topic);
  console.log(`  Title: ${script.episode_title}`);

  const episodeNumber = await getNextEpisodeNumber(db);
  const episode = await db.episode.create({
    data: {
      episodeNumber,
      topicTitle: topic,
      scriptJson: JSON.stringify(script),
      showNotes: script.show_notes,
      status: "synthesizing",
    },
  });

  console.log("\nStep 2: Synthesizing episode audio...");
  const report = await synthesizeEpisode(script, episode.id);

  await db.episode.update({
    where: {
      id: episode.id,
    },
    data: {
      charactersUsed: report.totalCharacters,
      status: report.failedTurns.length > 0 ? "failed" : "synthesizing",
    },
  });

  console.log("\nStep 3: Credit status...");
  const credits = await getCreditStatus();
  console.log(
    `  Used: ${credits.used.toLocaleString()} / ${credits.budget.toLocaleString()} (${credits.percentUsed}%)`,
  );
  console.log(`  Remaining: ${credits.remaining.toLocaleString()}`);

  console.log("\nStep 4: Output files...");
  report.results.forEach((result) => {
    console.log(
      `  ${result.filePath} (${result.characterCount} chars, ~${result.durationEstimate.toFixed(1)}s, ${result.emotion})`,
    );
  });

  if (report.failedTurns.length > 0) {
    console.log("\nFailed turns:");
    report.failedTurns.forEach((failedTurn) => {
      console.log(`  Turn ${failedTurn.turnIndex}: ${failedTurn.error}`);
    });
  }

  console.log("\nManifest:");
  console.log(`  ${report.outputDir}/manifest.json`);

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error("Synthesis test failed:", error);

  const { db } = await import("../src/lib/db");
  await db.$disconnect();
  process.exit(1);
});