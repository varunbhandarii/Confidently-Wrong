import { loadEnvConfig } from "@next/env";

type DatabaseClient = typeof import("../src/lib/db")["db"];

loadEnvConfig(process.cwd());

function listStageDirections(script: {
  intro_banter: Array<{ stage_direction?: string }>;
  main_discussion: Array<{ stage_direction?: string }>;
  hot_takes: Array<{ stage_direction?: string }>;
  outro: Array<{ stage_direction?: string }>;
}): Array<{ index: number; direction: string }> {
  const turns = [
    ...script.intro_banter,
    ...script.main_discussion,
    ...script.hot_takes,
    ...script.outro,
  ];

  return turns
    .map((turn, index) => ({ index, direction: turn.stage_direction?.trim() ?? "" }))
    .filter((entry) => entry.direction.length > 0);
}

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
  const topic = process.argv[2]?.trim() || "Are birds government drones?";

  const [{ generateScript }, { generateEpisodeSFX }, { getCacheStats }, { db }] = await Promise.all([
    import("../src/lib/llm"),
    import("../src/lib/sfx-pipeline"),
    import("../src/lib/audio-cache"),
    import("../src/lib/db"),
  ]);

  console.log(`1. Generating script for: \"${topic}\"`);
  const script = await generateScript(topic);
  console.log(`   Title: ${script.episode_title}`);

  const directions = listStageDirections(script);
  console.log(`   Stage directions found: ${directions.length}`);
  directions.forEach(({ index, direction }) => {
    console.log(`     [${index}] ${direction}`);
  });

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

  console.log("\n2. Running SFX pipeline...");
  const manifest = await generateEpisodeSFX(script, episode.id);

  console.log("\n3. Results:");
  console.log(`   Turn SFX mappings: ${manifest.turnSFX.size}`);
  for (const [turnIndex, filePath] of manifest.turnSFX.entries()) {
    console.log(`     Turn ${turnIndex}: ${filePath}`);
  }
  console.log(`   Intro: ${manifest.introJingle || "MISSING"}`);
  console.log(`   Outro: ${manifest.outroJingle || "MISSING"}`);
  console.log(`   Transitions: ${manifest.transitions.length}`);
  console.log(`   Manifest: ${manifest.manifestPath}`);

  console.log("\n4. Cache stats:");
  const stats = await getCacheStats();
  console.log(`   Jingles: ${stats.jingles}`);
  console.log(`   Transitions: ${stats.transitions}`);
  console.log(`   SFX: ${stats.sfx}`);
  console.log(`   Total cache size: ${(stats.totalSizeBytes / 1024).toFixed(0)} KB`);

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error("SFX pipeline test failed:", error);

  const { db } = await import("../src/lib/db");
  await db.$disconnect();
  process.exit(1);
});
