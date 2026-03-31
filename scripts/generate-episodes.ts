import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const RECOMMENDED_TOPICS = [
  "Is cereal a soup?",
  "Should pigeons have civil rights?",
  "The hidden agenda behind the alphabet",
  "Are naps a sport?",
  "The geopolitics of pizza toppings",
] as const;

const FALLBACK_TOPIC_VARIANTS: Record<string, string> = {
  "The hidden agenda behind the alphabet": "The hidden agenda behind alphabet order",
  "Are naps a sport?": "The startup potential of competitive sleeping",
};

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
  const successes: Array<{
    episodeNumber: number;
    topic: string;
    title: string;
    memeUrl: string | null;
  }> = [];
  const failures: Array<{
    requestedTopic: string | undefined;
    attemptedTopics: string[];
    reason: string;
  }> = [];

  console.log(`Generating ${queue.length} episode${queue.length === 1 ? "" : "s"}...`);

  for (const [index, requestedTopic] of queue.entries()) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Episode ${index + 1} of ${queue.length}`);
    console.log(`Topic: ${requestedTopic ?? "top pending topic / fallback"}`);
    console.log("=".repeat(60));

    const attemptedTopics = [requestedTopic, requestedTopic ? FALLBACK_TOPIC_VARIANTS[requestedTopic] : undefined]
      .filter((topic, topicIndex, topics): topic is string | undefined => topicIndex === topics.findIndex((entry) => entry === topic));

    let success = false;
    let lastError = "Unknown error";

    for (const topicVariant of attemptedTopics) {
      try {
        if (topicVariant && topicVariant !== requestedTopic) {
          console.log(`Retrying with safer topic phrasing: ${topicVariant}`);
        }

        const result = await generateEpisodePipeline({
          topic: topicVariant,
          publish: true,
        });

        successes.push({
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
        success = true;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.warn(`Topic run failed for \"${topicVariant ?? "auto-picked topic"}\": ${lastError}`);
      }
    }

    if (!success) {
      failures.push({
        requestedTopic,
        attemptedTopics: attemptedTopics.filter((topic): topic is string => Boolean(topic)),
        reason: lastError,
      });
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("Batch generation complete");
  console.log("=".repeat(60));

  for (const result of successes) {
    console.log(
      `SUCCESS | EP ${String(result.episodeNumber).padStart(3, "0")} | ${result.topic} | ${result.title}`,
    );
  }

  for (const failure of failures) {
    console.log(
      `FAILED  | ${failure.requestedTopic ?? "auto-picked topic"} | tried: ${failure.attemptedTopics.join(" -> ") || "auto"} | ${failure.reason}`,
    );
  }

  await db.$disconnect();

  if (successes.length === 0) {
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error("Batch generation failed:", error);

  const { db } = await import("../src/lib/db");
  await db.$disconnect();
  process.exit(1);
});
