import { getCachedAudio, hashPrompt } from "./audio-cache";
import { SFX_PROMPT_MAP, type SfxPromptTemplate } from "./audio-prompts";
import type { DialogueTurn, PodcastScript } from "./types";

export interface SFXRequest {
  turnIndices: number[];
  rawDirections: string[];
  normalizedKey: string;
  sfxPrompt: string;
  promptHash: string;
  cached: boolean;
  durationSeconds?: number;
  promptInfluence?: number;
  loop?: boolean;
}

function flattenScript(script: PodcastScript): Array<{ turn: DialogueTurn; globalIndex: number }> {
  const sections = [script.intro_banter, script.main_discussion, script.hot_takes, script.outro];
  const flattened: Array<{ turn: DialogueTurn; globalIndex: number }> = [];
  let globalIndex = 0;

  for (const section of sections) {
    for (const turn of section) {
      flattened.push({ turn, globalIndex });
      globalIndex += 1;
    }
  }

  return flattened;
}

function parseSoundDirective(direction: string): string | null {
  const match = direction.match(/\[sound:\s*(.+?)\]/i);
  return match ? match[1].trim() : null;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function findBestTemplate(description: string): { key: string; template: SfxPromptTemplate } {
  const normalized = normalizeKey(description);

  if (normalized in SFX_PROMPT_MAP) {
    return {
      key: normalized,
      template: SFX_PROMPT_MAP[normalized],
    };
  }

  for (const [key, template] of Object.entries(SFX_PROMPT_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { key, template };
    }
  }

  return {
    key: normalized,
    template: {
      prompt: `${description}, sound effect, short, clear`,
      durationSeconds: normalized.includes("long") ? 3 : 2,
      promptInfluence: 0.55,
    },
  };
}

export function extractSFXRequests(script: PodcastScript): SFXRequest[] {
  const byHash = new Map<string, SFXRequest>();

  for (const { turn, globalIndex } of flattenScript(script)) {
    if (!turn.stage_direction) {
      continue;
    }

    const description = parseSoundDirective(turn.stage_direction);

    if (!description) {
      continue;
    }

    const { key, template } = findBestTemplate(description);
    const promptHash = hashPrompt(template.prompt, "sfx", {
      durationSeconds: template.durationSeconds,
      promptInfluence: template.promptInfluence,
      loop: template.loop,
      modelId: "eleven_text_to_sound_v2",
      outputFormat: "mp3_44100_128",
    });
    const existing = byHash.get(promptHash);

    if (existing) {
      existing.turnIndices.push(globalIndex);
      existing.rawDirections.push(turn.stage_direction);
      continue;
    }

    byHash.set(promptHash, {
      turnIndices: [globalIndex],
      rawDirections: [turn.stage_direction],
      normalizedKey: key,
      sfxPrompt: template.prompt,
      promptHash,
      cached:
        getCachedAudio(template.prompt, "sfx", {
          durationSeconds: template.durationSeconds,
          promptInfluence: template.promptInfluence,
          loop: template.loop,
          modelId: "eleven_text_to_sound_v2",
          outputFormat: "mp3_44100_128",
        }) !== null,
      durationSeconds: template.durationSeconds,
      promptInfluence: template.promptInfluence,
      loop: template.loop,
    });
  }

  return Array.from(byHash.values()).sort((left, right) => left.turnIndices[0] - right.turnIndices[0]);
}