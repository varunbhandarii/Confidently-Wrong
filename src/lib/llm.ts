import Anthropic from "@anthropic-ai/sdk";

import { config } from "./config";
import { FEW_SHOT_EXAMPLE } from "./few-shot-example";
import {
  ScriptValidationError,
  calculateCharacterBudget,
  validateScript,
} from "./script-validator";
import { SYSTEM_PROMPT } from "./system-prompt";
import type { PodcastScript } from "./types";

let anthropic: Anthropic | undefined;

function getAnthropicClient(): Anthropic {
  anthropic ??= new Anthropic({
    apiKey: config.anthropic.apiKey,
  });

  return anthropic;
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Try other extraction strategies below.
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // Fall through to brace matching.
    }
  }

  let depth = 0;
  let start = -1;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        const candidate = text.slice(start, index + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          // Keep scanning in case there is another object later.
        }
      }
    }
  }

  throw new Error("No valid JSON found in LLM response.");
}

function getFullSystemPrompt(): string {
  return `${SYSTEM_PROMPT}\n\n${FEW_SHOT_EXAMPLE}`;
}

export async function generateScript(topic: string, maxRetries = 2): Promise<PodcastScript> {
  const prompt = getFullSystemPrompt();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      console.log(`Generating script for \"${topic}\" (attempt ${attempt + 1}/${maxRetries + 1})`);

      const response = await getAnthropicClient().messages.create({
        model: config.anthropic.model,
        max_tokens: config.anthropic.maxTokens,
        system: prompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `Generate a Confidently Wrong podcast episode about: ${topic}\n\n` +
                  "Respond with raw JSON only. No markdown. No code fences. No explanation.",
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

      if (!text) {
        throw new Error("Empty LLM response.");
      }

      const parsed = extractJson(text);
      validateScript(parsed);

      const budget = calculateCharacterBudget(parsed);
      if (budget.total < 2000) {
        throw new ScriptValidationError("total_characters", `script too short: ${budget.total} chars`);
      }
      if (budget.total > 4000) {
        throw new ScriptValidationError("total_characters", `script too long: ${budget.total} chars`);
      }

      console.log(
        `Script generated successfully (${budget.total} chars). ` +
          Object.entries(budget.bySection)
            .map(([section, value]) => `${section}: ${value}`)
            .join(", "),
      );

      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Script generation attempt ${attempt + 1} failed: ${lastError.message}`);

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw new Error(
    `Script generation failed after ${maxRetries + 1} attempts: ${lastError?.message ?? "Unknown error"}`,
  );
}

export async function testGeneration(topic: string): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing topic: ${topic}`);
  console.log("=".repeat(60));

  const script = await generateScript(topic);
  const budget = calculateCharacterBudget(script);

  console.log(`Title: ${script.episode_title}`);
  console.log(`Sponsor: ${script.fake_sponsor.name} - ${script.fake_sponsor.tagline}`);
  console.log(`Total chars: ${budget.total}`);
  console.log(`Chad chars: ${budget.bySpeaker.chad}`);
  console.log(`Marina chars: ${budget.bySpeaker.marina}`);
  console.log(`Show notes: ${script.show_notes}`);
  console.log("\nSample dialogue:");

  for (const turn of script.main_discussion.slice(0, 4)) {
    const direction = turn.stage_direction ? ` ${turn.stage_direction}` : "";
    console.log(`${turn.speaker.toUpperCase()} [${turn.emotion}]${direction}`);
    console.log(`  ${turn.text}`);
  }
}
