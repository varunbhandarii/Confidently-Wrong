import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const RECOMMENDED_TOPICS = [
  "Is cereal a soup?",
  "Should pigeons have civil rights?",
  "The hidden agenda behind the alphabet",
  "Are naps a sport?",
  "The geopolitics of pizza toppings",
] as const;

function parseCount(rawValue: string | undefined): number {
  const parsed = Number.parseInt(rawValue ?? "3", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Pass a positive episode count, for example: `npm run generate:episodes -- 3`.");
  }

  return parsed;
}

function buildTopicQueue(count: number, customTopics: string[]): Array<string | undefined> {
  const sanitizedCustomTopics = customTopics.map((topic) => topic.trim()).filter(Boolean);
  if (sanitizedCustomTopics.length > 0) {
    return sanitizedCustomTopics.slice(0, count);
  }

  const seededTopics = RECOMMENDED_TOPICS.slice(0, count);
  const remaining = Math.max(0, count - seededTopics.length);

  return [
    ...seededTopics,
    ...Array.from({ length: remaining }, () => undefined),
  ];
}

async function main() {
  const count = parseCount(process.argv[2]);
  const customTopics = process.argv.slice(3);

  const [{ db }, { generateEpisodePipeline }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/episode-generation"),
  ]);

  const queue = buildTopicQueue(count, customTopics);
  const results: Array<{
    episodeNumber: number;
    topic: string;
    title: string;
    memeUrl: string | null;
  }> = [];

  console.log(`Generating ${queue.length} episode${queue.length === 1 ? "" : "s"}...`);

  for (const [index, topic] of queue.entries()) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Episode ${index + 1} of ${queue.length}`);
    console.log(`Topic: ${topic ?? "top pending topic / fallback"}`);
    console.log("=".repeat(60));

    const result = await generateEpisodePipeline({
      topic,
      publish: true,
    });

    results.push({
      episodeNumber: result.episodeNumber,
      topic: result.topic,
      title: result.title,
      memeUrl: result.memeUrl,
    });

    console.log(
      `Published EP ${String(result.episodeNumber).padStart(3, "0")}: ${result.title}`,
    );
    console.log(`Feed topic: ${result.topic}`);
    console.log(`Meme: ${result.memeUrl ?? "not generated"}`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("Batch generation complete");
  console.log("=".repeat(60));
  for (const result of results) {
    console.log(
      `EP ${String(result.episodeNumber).padStart(3, "0")} | ${result.topic} | ${result.title}`,
    );
  }

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error("Batch generation failed:", error);

  const { db } = await import("../src/lib/db");
  await db.$disconnect();
  process.exit(1);
});
