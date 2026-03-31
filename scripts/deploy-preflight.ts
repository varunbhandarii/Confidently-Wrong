import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const ALLOW_LOCAL_BASE_URL = process.argv.includes("--allow-local-base-url");

const REQUIRED_ENV_VARS = [
  "ELEVENLABS_API_KEY",
  "ANTHROPIC_API_KEY",
  "CHAD_VOICE_ID",
  "MARINA_VOICE_ID",
  "ADMIN_PASSWORD",
  "BASE_URL",
  "MEMELORD_API_KEY",
] as const;

function checkRequiredEnv(): string[] {
  const failures: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]?.trim()) {
      failures.push(`Missing ${key}`);
    }
  }

  const baseUrl = process.env.BASE_URL?.trim() ?? "";
  if (!ALLOW_LOCAL_BASE_URL && /localhost|127\.0\.0\.1/i.test(baseUrl)) {
    failures.push("BASE_URL still points to localhost. Set it to your live Replit HTTPS URL.");
  }

  return failures;
}

function checkFileExists(relativePath: string): string | null {
  const absolutePath = path.join(process.cwd(), relativePath);
  return existsSync(absolutePath) ? null : `Missing required file: ${relativePath}`;
}

function checkFfmpeg(): string | null {
  try {
    const versionLine = execFileSync("ffmpeg", ["-version"], { encoding: "utf8" }).split("\n")[0]?.trim();
    console.log(`PASS ffmpeg available: ${versionLine}`);
    return null;
  } catch {
    return "ffmpeg is not installed or not on PATH.";
  }
}

async function checkDatabase(): Promise<string | null> {
  try {
    const { db } = await import("../src/lib/db");
    await db.$queryRawUnsafe("SELECT 1");
    const episodeCount = await db.episode.count();
    const topicCount = await db.topic.count();
    console.log(`PASS database reachable: ${episodeCount} episode(s), ${topicCount} topic(s)`);
    await db.$disconnect();
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes(".prisma/client/default")) {
      return "Prisma client is not generated yet. After Replit switches to Node 22, run `npx prisma generate` and then rerun this preflight.";
    }
    return `Database check failed: ${message}`;
  }
}

async function main() {
  const failures = checkRequiredEnv();

  for (const fileCheck of [
    checkFileExists("public/images/podcast-cover.jpg"),
    checkFileExists("public/images/memes"),
  ]) {
    if (fileCheck) {
      failures.push(fileCheck);
    }
  }

  const ffmpegFailure = checkFfmpeg();
  if (ffmpegFailure) {
    failures.push(ffmpegFailure);
  }

  const databaseFailure = await checkDatabase();
  if (databaseFailure) {
    failures.push(databaseFailure);
  }

  if (failures.length > 0) {
    console.error("\nDeployment preflight failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("\nDeployment preflight passed.");
}

void main();
