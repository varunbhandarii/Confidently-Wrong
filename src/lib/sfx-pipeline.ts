import { ensureReusableAssets, generateSFX, writeEpisodeManifest } from "./audio-generator";
import { extractSFXRequests } from "./sfx-extractor";
import type { PodcastScript } from "./types";

export interface SFXManifest {
  turnSFX: Map<number, string>;
  introJingle: string;
  outroJingle: string;
  transitions: string[];
  totalGenerated: number;
  totalCacheHits: number;
  generationErrors: string[];
  manifestPath: string;
}

function serializeTurnSfx(turnSFX: Map<number, string>): Record<string, string> {
  return Object.fromEntries(
    Array.from(turnSFX.entries()).map(([index, filePath]) => [String(index), filePath]),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateEpisodeSFX(
  script: PodcastScript,
  episodeId: string,
): Promise<SFXManifest> {
  console.log("\nEnsuring reusable audio assets...");
  const reusableAssets = await ensureReusableAssets();

  console.log("\nGenerating episode SFX...");
  const requests = extractSFXRequests(script);
  console.log(`  Unique SFX requests: ${requests.length}`);
  console.log(`  Cache hits before generation: ${requests.filter((request) => request.cached).length}`);

  const turnSFX = new Map<number, string>();
  let totalGenerated = 0;
  let totalCacheHits = 0;
  const generationErrors: string[] = [];

  for (const request of requests) {
    try {
      const filePath = await generateSFX(request.sfxPrompt, {
        episodeId,
        durationSeconds: request.durationSeconds,
        promptInfluence: request.promptInfluence,
        loop: request.loop,
      });

      request.turnIndices.forEach((turnIndex) => {
        turnSFX.set(turnIndex, filePath);
      });

      if (request.cached) {
        totalCacheHits += 1;
      } else {
        totalGenerated += 1;
        await sleep(1000);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      generationErrors.push(
        `${request.normalizedKey} at turns ${request.turnIndices.join(", ")}: ${message}`,
      );
      console.warn(`  [warn] ${message}`);
    }
  }

  const manifestPath = await writeEpisodeManifest(episodeId, "sfx-manifest.json", {
    episodeId,
    introJingle: reusableAssets.intro_jingle ?? "",
    outroJingle: reusableAssets.outro_jingle ?? "",
    transitions: [
      reusableAssets.transition_1,
      reusableAssets.transition_2,
      reusableAssets.transition_3,
    ].filter(Boolean),
    turnSFX: serializeTurnSfx(turnSFX),
    totalGenerated,
    totalCacheHits,
    generationErrors,
    requests,
  });

  console.log(`  Generated new SFX: ${totalGenerated}`);
  console.log(`  Cache hits used: ${totalCacheHits}`);
  console.log(`  Manifest: ${manifestPath}`);

  return {
    turnSFX,
    introJingle: reusableAssets.intro_jingle ?? "",
    outroJingle: reusableAssets.outro_jingle ?? "",
    transitions: [
      reusableAssets.transition_1,
      reusableAssets.transition_2,
      reusableAssets.transition_3,
    ].filter(Boolean),
    totalGenerated,
    totalCacheHits,
    generationErrors,
    manifestPath,
  };
}