import { getAudioSectionBoundaries } from "./script-layout";
import { calculateGap } from "./gap-calculator";
import type { SynthesisReport } from "./synthesis-orchestrator";
import type { SFXManifest } from "./sfx-pipeline";
import type { PodcastScript } from "./types";

export type SegmentType = "jingle" | "transition" | "dialogue" | "silence";

export interface AudioSegment {
  type: SegmentType;
  filePath?: string;
  durationMs?: number;
  volume: number;
  label: string;
  turnIndex?: number;
}

export interface SfxEvent {
  turnIndex: number;
  filePath: string;
  volume: number;
  label: string;
}

export interface SequencePlan {
  segments: AudioSegment[];
  sfxEvents: SfxEvent[];
}

function getTransitionForBoundary(transitions: string[], boundaryIndex: number): string | null {
  if (transitions.length === 0) {
    return null;
  }

  return transitions[boundaryIndex % transitions.length] ?? null;
}

export function buildSequence(
  script: PodcastScript,
  synthesis: SynthesisReport,
  sfx: SFXManifest,
): SequencePlan {
  const segments: AudioSegment[] = [];
  const sfxEvents: SfxEvent[] = [];
  const boundaries = getAudioSectionBoundaries(script);
  const results = synthesis.results;

  if (sfx.introJingle) {
    segments.push({
      type: "jingle",
      filePath: sfx.introJingle,
      volume: 1,
      label: "Intro jingle",
    });
    segments.push({
      type: "silence",
      durationMs: 500,
      volume: 0,
      label: "Post-intro pad",
    });
  }

  results.forEach((current, index) => {
    const next = index < results.length - 1 ? results[index + 1] : null;
    const boundaryIndex = [boundaries.introEnd, boundaries.mainEnd, boundaries.hotTakesEnd].indexOf(index + 1);
    const isSectionBoundary = boundaryIndex !== -1 && next !== null;

    segments.push({
      type: "dialogue",
      filePath: current.filePath,
      volume: 1,
      label: `Turn ${current.turnIndex}: ${current.speaker} [${current.emotion}]`,
      turnIndex: current.turnIndex,
    });

    if (sfx.turnSFX.has(current.turnIndex)) {
      const sfxPath = sfx.turnSFX.get(current.turnIndex);
      if (sfxPath) {
        sfxEvents.push({
          turnIndex: current.turnIndex,
          filePath: sfxPath,
          volume: 0.5,
          label: `SFX after turn ${current.turnIndex}`,
        });
      }
    }

    if (isSectionBoundary) {
      segments.push({
        type: "silence",
        durationMs: 300,
        volume: 0,
        label: "Pre-transition pad",
      });

      const transitionPath = getTransitionForBoundary(sfx.transitions, boundaryIndex);
      if (transitionPath) {
        segments.push({
          type: "transition",
          filePath: transitionPath,
          volume: 0.8,
          label: "Section transition",
        });
      }

      segments.push({
        type: "silence",
        durationMs: 300,
        volume: 0,
        label: "Post-transition pad",
      });
      return;
    }

    const gap = calculateGap(current, next, false);
    if (gap.durationMs > 0) {
      segments.push({
        type: "silence",
        durationMs: gap.durationMs,
        volume: 0,
        label: `Gap: ${gap.reason}`,
      });
    }
  });

  if (sfx.outroJingle) {
    segments.push({
      type: "silence",
      durationMs: 500,
      volume: 0,
      label: "Pre-outro pad",
    });
    segments.push({
      type: "jingle",
      filePath: sfx.outroJingle,
      volume: 1,
      label: "Outro jingle",
    });
  }

  return { segments, sfxEvents };
}

export function printSequence(plan: SequencePlan): void {
  console.log("\nMixing sequence:");
  plan.segments.forEach((segment, index) => {
    const durationLabel = segment.durationMs ? ` [${segment.durationMs}ms]` : "";
    const volumeLabel = segment.volume < 1 ? ` (${Math.round(segment.volume * 100)}%)` : "";
    console.log(`  ${String(index + 1).padStart(2, "0")} ${segment.type.padEnd(10)} ${segment.label}${volumeLabel}${durationLabel}`);
  });

  if (plan.sfxEvents.length > 0) {
    console.log("\nSFX overlays:");
    plan.sfxEvents.forEach((event) => {
      console.log(`  Turn ${event.turnIndex} -> ${event.filePath}`);
    });
  }
}
