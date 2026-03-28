import { requireVoiceId } from "./config";
import type { Speaker } from "./types";

export interface VoiceProfile {
  voiceId: string;
  name: string;
  modelId: string;
  outputFormat: "mp3_44100_128";
  description: string;
}

export const VOICE_REGISTRY: Record<Speaker, VoiceProfile> = {
  chad: {
    voiceId: requireVoiceId("chad"),
    name: "Chad",
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    description: "Overconfident tech bro, American man in his 30s.",
  },
  marina: {
    voiceId: requireVoiceId("marina"),
    name: "Marina",
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    description: "Dramatic conspiracy theorist, woman in her 40s with a subtle Eastern European accent.",
  },
};

export const SYNTHESIS_CONFIG = {
  outputFormat: "mp3_44100_128" as const,
  sampleRate: 44100,
  bitrateKbps: 128,
  fileExtension: ".mp3" as const,
  concurrencyLimit: 3,
  retryLimit: 2,
  retryBaseDelayMs: 2000,
  interBatchDelayMs: 500,
} as const;

export function getVoiceProfile(speaker: Speaker): VoiceProfile {
  return VOICE_REGISTRY[speaker];
}