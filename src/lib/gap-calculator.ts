import type { SynthesisResult } from "./synthesizer";

export interface GapDecision {
  durationMs: number;
  reason: string;
}

export function calculateGap(
  current: SynthesisResult,
  next: SynthesisResult | null,
  isSectionBoundary: boolean,
): GapDecision {
  if (isSectionBoundary) {
    return { durationMs: 0, reason: "section boundary" };
  }

  if (!next) {
    return { durationMs: 0, reason: "last turn" };
  }

  const direction = current.stageDirection ?? "";

  if (direction.includes("[interrupts]")) {
    return { durationMs: 0, reason: "interrupts" };
  }

  if (direction.includes("[dramatic pause]")) {
    return { durationMs: 1500, reason: "dramatic pause" };
  }

  if (direction.includes("[long pause]")) {
    return { durationMs: 2500, reason: "long pause" };
  }

  if (direction.includes("[both laugh]")) {
    return { durationMs: 200, reason: "both laugh" };
  }

  if (current.speaker === next.speaker) {
    return { durationMs: 250, reason: "same speaker" };
  }

  if (current.emotion === "excited" || current.emotion === "interrupting") {
    return { durationMs: 200, reason: "excited/interrupting" };
  }

  if (current.emotion === "ominous") {
    return { durationMs: 600, reason: "ominous lingers" };
  }

  return { durationMs: 400, reason: "default" };
}
