import { loadEnvConfig } from "@next/env";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd());

const EPISODE_AUDIO_DIR = path.join(process.cwd(), "public", "audio", "episodes");
const MEME_DIR = path.join(process.cwd(), "public", "images", "memes");

async function clearDirectoryContents(targetDir: string, keepNames: string[] = []) {
  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
    return;
  }

  const entries = await readdir(targetDir, { withFileTypes: true });
  for (const entry of entries) {
    if (keepNames.includes(entry.name)) {
      continue;
    }

    const entryPath = path.join(targetDir, entry.name);
    await rm(entryPath, { recursive: true, force: true });
  }
}

async function main() {
  const [{ db }, { invalidateFeedCache }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/feed-cache"),
  ]);

  const episodeCount = await db.episode.count();
  const attachedAudioAssetCount = await db.audioAsset.count({
    where: {
      episodeId: {
        not: null,
      },
    },
  });

  await db.audioAsset.deleteMany({
    where: {
      episodeId: {
        not: null,
      },
    },
  });

  await db.episode.deleteMany({});

  await db.topic.updateMany({
    where: {
      status: {
        in: ["selected", "used"],
      },
    },
    data: {
      status: "pending",
    },
  });

  await clearDirectoryContents(EPISODE_AUDIO_DIR);
  await clearDirectoryContents(MEME_DIR, [".gitkeep"]);
  invalidateFeedCache();

  console.log(`Removed ${episodeCount} episode record(s).`);
  console.log(`Removed ${attachedAudioAssetCount} episode-linked audio asset record(s).`);
  console.log("Reset topic statuses from selected/used back to pending.");
  console.log("Cleared generated episode audio and meme files.");

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error("Reset failed:", error);

  const { db } = await import("../src/lib/db");
  await db.$disconnect();
  process.exit(1);
});
