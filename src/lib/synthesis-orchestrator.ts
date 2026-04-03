import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { db } from "./db";
import { canAffordEpisode } from "./credit-tracker";
import { createSponsorTurn } from "./script-layout";
import { calculateCharacterBudget } from "./script-validator";
import { synthesizeTurn, type SynthesisResult } from "./synthesizer";
import { SYNTHESIS_CONFIG } from "./voice-registry";
import type { DialogueTurn, PodcastScript, Speaker } from "./types";

interface IndexedTurn {
  turn: DialogueTurn;
  index: number;
}

export interface FailedTurn {
  turnIndex: number;
  speaker: Speaker;
  text: string;
  error: string;
}

export interface SynthesisReport {
  episodeId: string;
  outputDir: string;
  results: SynthesisResult[];
  totalCharacters: number;
  totalDurationEstimate: number;
  failedTurns: FailedTurn[];
  elapsedMs: number;
}

class FatalSynthesisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalSynthesisError";
  }
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function flattenScript(script: PodcastScript): DialogueTurn[] {
  const sponsorTurn = createSponsorTurn(script);

  return [
    ...script.intro_banter,
    ...script.main_discussion,
    ...script.hot_takes,
    ...(sponsorTurn ? [sponsorTurn] : []),
    ...script.outro,
  ];
}

function classifyError(error: unknown): {
  retryable: boolean;
  fatalPipeline: boolean;
  normalizedMessage: string;
} {
  const normalizedMessage = error instanceof Error ? error.message : String(error);
  const message = normalizedMessage.toLowerCase();

  if (message.includes("401") || message.includes("unauthorized") || message.includes("api key")) {
    return { retryable: false, fatalPipeline: true, normalizedMessage };
  }

  if (message.includes("quota") || message.includes("credit") || message.includes("billing")) {
    return { retryable: false, fatalPipeline: true, normalizedMessage };
  }

  if (message.includes("422") || message.includes("invalid voice") || message.includes("unprocessable")) {
    return { retryable: false, fatalPipeline: false, normalizedMessage };
  }

  if (message.includes("429") || message.includes("rate limit") || message.includes("too many requests")) {
    return { retryable: true, fatalPipeline: false, normalizedMessage };
  }

  if (
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("fetch failed") ||
    message.includes("temporarily unavailable")
  ) {
    return { retryable: true, fatalPipeline: false, normalizedMessage };
  }

  return { retryable: true, fatalPipeline: false, normalizedMessage };
}

async function withRetry<T>(
  operation: () => Promise<T>,
  label: string,
  maxRetries = SYNTHESIS_CONFIG.retryLimit,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const classification = classifyError(error);
      lastError = error instanceof Error ? error : new Error(String(error));

      if (classification.fatalPipeline) {
        throw new FatalSynthesisError(classification.normalizedMessage);
      }

      if (!classification.retryable || attempt === maxRetries) {
        break;
      }

      const delay = classification.normalizedMessage.toLowerCase().includes("429") ||
        classification.normalizedMessage.toLowerCase().includes("rate")
        ? SYNTHESIS_CONFIG.retryBaseDelayMs * 2 ** attempt
        : SYNTHESIS_CONFIG.retryBaseDelayMs;

      console.warn(`  [${label}] attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error(`${label} failed for an unknown reason.`);
}

async function processBatch(
  turns: IndexedTurn[],
  outputDir: string,
): Promise<{ results: SynthesisResult[]; failures: FailedTurn[] }> {
  const settled = await Promise.allSettled(
    turns.map(async ({ turn, index }) =>
      withRetry(() => synthesizeTurn(turn, index, outputDir), `Turn ${index} (${turn.speaker})`),
    ),
  );

  const results: SynthesisResult[] = [];
  const failures: FailedTurn[] = [];
  let fatalError: FatalSynthesisError | null = null;

  settled.forEach((entry, batchIndex) => {
    const { turn, index } = turns[batchIndex];

    if (entry.status === "fulfilled") {
      results.push(entry.value);
      return;
    }

    const reason = entry.reason;

    if (reason instanceof FatalSynthesisError) {
      fatalError = reason;
      return;
    }

    const message = reason instanceof Error ? reason.message : String(reason);
    console.error(`  Turn ${index} failed: ${message}`);
    failures.push({
      turnIndex: index,
      speaker: turn.speaker,
      text: turn.text.slice(0, 120),
      error: message,
    });
  });

  if (fatalError) {
    throw fatalError;
  }

  return { results, failures };
}

async function persistDialogueAssets(episodeId: string, results: SynthesisResult[]): Promise<void> {
  await db.audioAsset.deleteMany({
    where: {
      episodeId,
      type: "dialogue",
    },
  });

  await Promise.all(
    results.map((result) =>
      db.audioAsset.create({
        data: {
          type: "dialogue",
          filePath: result.filePath,
          episodeId,
        },
      }),
    ),
  );
}

export async function synthesizeEpisode(
  script: PodcastScript,
  episodeId: string,
  baseOutputDir = path.join("public", "audio"),
): Promise<SynthesisReport> {
  const budget = calculateCharacterBudget(script);
  const creditCheck = await canAffordEpisode(budget.total);

  if (!creditCheck.canAfford) {
    throw new Error(
      `Insufficient ElevenLabs credits. Need ${budget.total}, remaining ${creditCheck.status.remaining}, budget ${creditCheck.status.percentUsed}% used.`,
    );
  }

  const outputDir = path.join(baseOutputDir, "episodes", episodeId);
  const normalizedOutputDir = toPosixPath(outputDir);
  const allTurns = flattenScript(script).map((turn, index) => ({ turn, index }));
  const startedAt = Date.now();

  await mkdir(outputDir, { recursive: true });

  console.log(`\nSynthesizing episode \"${script.episode_title}\"`);
  console.log(`  Turns: ${allTurns.length}`);
  console.log(`  Estimated characters: ${budget.total}`);
  console.log(`  Concurrency: ${SYNTHESIS_CONFIG.concurrencyLimit}`);

  const results: SynthesisResult[] = [];
  const failedTurns: FailedTurn[] = [];

  for (let offset = 0; offset < allTurns.length; offset += SYNTHESIS_CONFIG.concurrencyLimit) {
    const batch = allTurns.slice(offset, offset + SYNTHESIS_CONFIG.concurrencyLimit);
    const batchNumber = Math.floor(offset / SYNTHESIS_CONFIG.concurrencyLimit) + 1;
    const batchCount = Math.ceil(allTurns.length / SYNTHESIS_CONFIG.concurrencyLimit);

    console.log(`  Batch ${batchNumber}/${batchCount}`);

    const processed = await processBatch(batch, outputDir);
    results.push(...processed.results);
    failedTurns.push(...processed.failures);

    if (offset + SYNTHESIS_CONFIG.concurrencyLimit < allTurns.length) {
      await sleep(SYNTHESIS_CONFIG.interBatchDelayMs);
    }
  }

  results.sort((left, right) => left.turnIndex - right.turnIndex);

  const totalCharacters = results.reduce((sum, result) => sum + result.characterCount, 0);
  const totalDurationEstimate = results.reduce(
    (sum, result) => sum + result.durationEstimate,
    0,
  );
  const report: SynthesisReport = {
    episodeId,
    outputDir: normalizedOutputDir,
    results,
    totalCharacters,
    totalDurationEstimate,
    failedTurns,
    elapsedMs: Date.now() - startedAt,
  };

  await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(report, null, 2));
  await persistDialogueAssets(episodeId, results);

  console.log(`  Complete: ${results.length} turns succeeded, ${failedTurns.length} failed`);
  console.log(`  Duration estimate: ${totalDurationEstimate.toFixed(1)}s`);
  console.log(`  Wall time: ${(report.elapsedMs / 1000).toFixed(1)}s`);

  return report;
}