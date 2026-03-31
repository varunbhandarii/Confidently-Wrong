import type { DialogueTurn, PodcastScript } from "./types";

export interface ScoredQuote {
  speaker: string;
  text: string;
  score: number;
  memePrompt: string;
}

function scoreTurn(turn: DialogueTurn): number {
  let score = 0;
  const normalizedText = turn.text.toLowerCase();

  if (turn.text.length >= 40 && turn.text.length <= 140) {
    score += 3;
  } else if (turn.text.length >= 24) {
    score += 1;
  }

  if (
    normalizedText.includes("percent")
    || normalizedText.includes("%")
    || normalizedText.includes("studies show")
    || normalizedText.includes("my buddy")
    || normalizedText.includes("confirmed this")
  ) {
    score += 4;
  }

  if (
    normalizedText.includes("series")
    || normalizedText.includes("pivot")
    || normalizedText.includes("tam")
    || normalizedText.includes("disrupt")
    || normalizedText.includes("scale")
    || normalizedText.includes("funding")
    || normalizedText.includes("synergy")
  ) {
    score += 3;
  }

  if (
    normalizedText.includes("they don't want")
    || normalizedText.includes("follow the money")
    || normalizedText.includes("documented")
    || normalizedText.includes("shadow")
    || normalizedText.includes("cover-up")
    || normalizedText.includes("cartel")
    || normalizedText.includes("sealed")
  ) {
    score += 3;
  }

  if (turn.emotion === "confident" || turn.emotion === "excited") {
    score += 1;
  }

  if (turn.emotion === "ominous") {
    score += 2;
  }

  if (/[!?]/.test(turn.text)) {
    score += 1;
  }

  return score;
}

function buildMemePrompt(turn: DialogueTurn, topic: string): string {
  const escapedQuote = turn.text.replaceAll('"', '\\"');

  if (turn.speaker === "chad") {
    return `Tech bro confidently says "${escapedQuote}" while explaining ${topic}`;
  }

  return `Conspiracy theorist dramatically reveals "${escapedQuote}" about ${topic}`;
}

export function extractBestQuote(script: PodcastScript): ScoredQuote {
  const candidates: Array<{ turn: DialogueTurn; bonus: number }> = [
    ...script.intro_banter.map((turn) => ({ turn, bonus: 0 })),
    ...script.main_discussion.map((turn) => ({ turn, bonus: 1 })),
    ...script.hot_takes.map((turn) => ({ turn, bonus: 3 })),
    ...script.outro.map((turn) => ({ turn, bonus: 0 })),
  ];

  if (candidates.length === 0) {
    return {
      speaker: "chad",
      text: script.topic,
      score: 0,
      memePrompt: `Absurd podcast hosts confidently argue about ${script.topic}`,
    };
  }

  const scored = candidates
    .map(({ turn, bonus }) => ({
      speaker: turn.speaker,
      text: turn.text,
      score: scoreTurn(turn) + bonus,
      memePrompt: buildMemePrompt(turn, script.topic),
    }))
    .sort((left, right) => right.score - left.score);

  return scored[0];
}
