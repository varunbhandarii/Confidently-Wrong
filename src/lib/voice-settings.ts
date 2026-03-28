import type { EmotionTag, Speaker } from "./types";

export interface SynthesisVoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

const BASE_EMOTION_MAP: Record<EmotionTag, SynthesisVoiceSettings> = {
  confident: {
    stability: 0.71,
    similarityBoost: 0.8,
    style: 0.05,
    useSpeakerBoost: true,
  },
  excited: {
    stability: 0.3,
    similarityBoost: 0.72,
    style: 0.35,
    useSpeakerBoost: true,
  },
  ominous: {
    stability: 0.82,
    similarityBoost: 0.88,
    style: 0.15,
    useSpeakerBoost: true,
  },
  confused: {
    stability: 0.4,
    similarityBoost: 0.6,
    style: 0.1,
    useSpeakerBoost: true,
  },
  laughing: {
    stability: 0.18,
    similarityBoost: 0.5,
    style: 0.5,
    useSpeakerBoost: false,
  },
  interrupting: {
    stability: 0.28,
    similarityBoost: 0.75,
    style: 0.25,
    useSpeakerBoost: true,
  },
};

const SPEAKER_ADJUSTMENTS: Record<Speaker, { stability: number; style: number }> = {
  chad: {
    stability: 0.05,
    style: -0.05,
  },
  marina: {
    stability: -0.05,
    style: 0.08,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getVoiceSettings(emotion: EmotionTag, speaker: Speaker): SynthesisVoiceSettings {
  const base = BASE_EMOTION_MAP[emotion];
  const adjustment = SPEAKER_ADJUSTMENTS[speaker];

  return {
    stability: clamp(base.stability + adjustment.stability, 0, 1),
    similarityBoost: base.similarityBoost,
    style: clamp(base.style + adjustment.style, 0, 1),
    useSpeakerBoost: base.useSpeakerBoost,
  };
}

export { BASE_EMOTION_MAP };