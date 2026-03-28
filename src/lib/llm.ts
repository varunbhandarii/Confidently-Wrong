import Anthropic from "@anthropic-ai/sdk";

import { config } from "./config";

export interface DialogueTurn {
  speaker: "chad" | "marina";
  text: string;
  emotion: string;
  stage_direction?: string;
}

export interface PodcastScript {
  topic: string;
  intro_banter: DialogueTurn[];
  main_discussion: DialogueTurn[];
  hot_takes: DialogueTurn[];
  outro: DialogueTurn[];
  fake_sponsor: {
    name: string;
    tagline: string;
  };
}

let anthropic: Anthropic | undefined;

function getAnthropicClient(): Anthropic {
  anthropic ??= new Anthropic({
    apiKey: config.anthropic.apiKey,
  });

  return anthropic;
}

const systemPrompt = [
  "Generate structured JSON for a two-host comedy podcast episode.",
  "Return valid JSON only with no markdown fences or extra commentary.",
  "Phase 2 will replace this placeholder with the full Chad and Marina prompt.",
].join(" ");

function isDialogueTurn(value: unknown): value is DialogueTurn {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    (record.speaker === "chad" || record.speaker === "marina") &&
    typeof record.text === "string" &&
    typeof record.emotion === "string" &&
    (record.stage_direction === undefined || typeof record.stage_direction === "string")
  );
}

function isDialogueTurnList(value: unknown): value is DialogueTurn[] {
  return Array.isArray(value) && value.every(isDialogueTurn);
}

function validateScript(data: unknown): data is PodcastScript {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const value = data as Record<string, unknown>;
  const fakeSponsor = value.fake_sponsor;

  return (
    typeof value.topic === "string" &&
    isDialogueTurnList(value.intro_banter) &&
    isDialogueTurnList(value.main_discussion) &&
    isDialogueTurnList(value.hot_takes) &&
    isDialogueTurnList(value.outro) &&
    typeof fakeSponsor === "object" &&
    fakeSponsor !== null &&
    typeof (fakeSponsor as Record<string, unknown>).name === "string" &&
    typeof (fakeSponsor as Record<string, unknown>).tagline === "string"
  );
}

function extractJsonBlock(rawText: string): string {
  const match = rawText.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("No JSON object found in model response.");
  }

  return match[0];
}

export async function generateScript(topic: string, maxRetries = 2): Promise<PodcastScript> {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await getAnthropicClient().messages.create({
        model: config.anthropic.model,
        max_tokens: config.anthropic.maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Generate a podcast episode about "${topic}".`,
              },
            ],
          },
        ],
      });

      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      const parsed = JSON.parse(extractJsonBlock(text)) as unknown;

      if (!validateScript(parsed)) {
        throw new Error("Schema validation failed for generated script.");
      }

      return parsed;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      console.warn(`Script generation attempt ${attempt + 1} failed. Retrying...`, error);
    }
  }

  throw new Error("Script generation retries exhausted.");
}
