import { loadEnvConfig } from "@next/env";
import Anthropic from "@anthropic-ai/sdk";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

loadEnvConfig(process.cwd());

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }

  return value;
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (value) {
      chunks.push(value);
    }
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

async function smokeTest() {
  console.log("=== SMOKE TEST START ===\n");

  console.log("1. Testing LLM API...");
  const anthropic = new Anthropic({
    apiKey: requireEnv("ANTHROPIC_API_KEY"),
  });

  const llmResponse = await anthropic.messages.create({
    model: process.env.LLM_MODEL?.trim() || "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Say one confident but wrong fact about cereal in 20 words or less.",
          },
        ],
      },
    ],
  });

  const llmText = llmResponse.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  console.log("   LLM says:", llmText);
  console.log("   PASS\n");

  console.log("2. Testing ElevenLabs TTS...");
  const elevenLabs = new ElevenLabsClient({
    apiKey: requireEnv("ELEVENLABS_API_KEY"),
  });

  const audio = await elevenLabs.textToSpeech.convert(requireEnv("CHAD_VOICE_ID"), {
    text: llmText,
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0,
    },
  });

  const audioDir = "public/audio/episodes";
  await mkdir(audioDir, { recursive: true });
  await writeFile(`${audioDir}/smoke-test.mp3`, await streamToBuffer(audio));

  console.log(`   Audio saved: ${audioDir}/smoke-test.mp3`);
  console.log("   PASS\n");

  console.log("3. Testing ffmpeg...");
  const ffmpegVersion = execSync("ffmpeg -version", { encoding: "utf8" }).split("\n")[0];
  console.log("  ", ffmpegVersion);
  console.log("   PASS\n");

  console.log("4. Testing database...");
  const db = new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL?.trim() || "file:./prisma/dev.db",
    }),
  });

  const topic = await db.topic.create({
    data: {
      title: "Is cereal a soup?",
      submittedByIp: "smoke-test",
    },
  });

  console.log("   Topic created:", topic.id);

  await db.topic.delete({
    where: { id: topic.id },
  });

  console.log("   Topic deleted (cleanup)");
  await db.$disconnect();
  console.log("   PASS\n");

  console.log("=== ALL TESTS PASSED ===");
  console.log(`Play the test audio: ${audioDir}/smoke-test.mp3`);
}

smokeTest().catch((error) => {
  console.error("SMOKE TEST FAILED:", error);
  process.exit(1);
});

