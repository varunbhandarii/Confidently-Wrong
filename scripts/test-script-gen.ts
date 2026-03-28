import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const TEST_TOPICS = [
  "Is cereal a soup?",
  "Should dogs have jobs?",
  "The geopolitics of pizza toppings",
  "Are clouds just sky pillows?",
  "Why don't fish get thirsty?",
];

async function main() {
  const { getRandomTopic } = await import("../src/lib/fallback-topics");
  const { testGeneration } = await import("../src/lib/llm");

  const topic = process.argv[2]?.trim() || getRandomTopic();
  const selectedTopic = topic.length > 0 ? topic : TEST_TOPICS[Math.floor(Math.random() * TEST_TOPICS.length)];

  await testGeneration(selectedTopic);
}

main().catch((error) => {
  console.error("Script generation test failed:", error);
  process.exit(1);
});
