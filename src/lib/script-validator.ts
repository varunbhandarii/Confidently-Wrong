import type {
  DialogueTurn,
  EmotionTag,
  PodcastScript,
  ScriptCharacterBudget,
  Speaker,
} from "./types";

const VALID_SPEAKERS: Speaker[] = ["chad", "marina"];
const VALID_EMOTIONS: EmotionTag[] = [
  "confident",
  "excited",
  "ominous",
  "confused",
  "laughing",
  "interrupting",
];

const STAGE_DIRECTION_PATTERNS = [
  /^\[interrupts\]$/,
  /^\[dramatic pause\]$/,
  /^\[long pause\]$/,
  /^\[both laugh\]$/,
  /^\[whispers\]$/,
  /^\[sound: .+\]$/,
  /^\[music: .+\]$/,
];

export class ScriptValidationError extends Error {
  constructor(
    public field: string,
    public reason: string,
  ) {
    super(`Script validation failed: ${field} - ${reason}`);
    this.name = "ScriptValidationError";
  }
}

function assertNonEmptyString(value: unknown, field: string, min = 1, max?: number): asserts value is string {
  if (typeof value !== "string") {
    throw new ScriptValidationError(field, "must be a string");
  }

  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new ScriptValidationError(field, `must be at least ${min} characters`);
  }

  if (max !== undefined && trimmed.length > max) {
    throw new ScriptValidationError(field, `must be at most ${max} characters`);
  }
}

function validateStageDirection(value: unknown, field: string) {
  if (value === undefined) {
    return;
  }

  assertNonEmptyString(value, field, 3, 50);

  const normalized = value.trim();
  const matchesKnownPattern = STAGE_DIRECTION_PATTERNS.some((pattern) => pattern.test(normalized));

  if (!matchesKnownPattern) {
    throw new ScriptValidationError(
      field,
      'must match a known stage-direction pattern like "[interrupts]" or "[sound: thunder crash]"',
    );
  }
}

function validateTurn(turn: unknown, index: number, section: string): asserts turn is DialogueTurn {
  if (typeof turn !== "object" || turn === null) {
    throw new ScriptValidationError(`${section}[${index}]`, "must be an object");
  }

  const value = turn as Record<string, unknown>;

  if (!VALID_SPEAKERS.includes(value.speaker as Speaker)) {
    throw new ScriptValidationError(
      `${section}[${index}].speaker`,
      `must be one of: ${VALID_SPEAKERS.join(", ")}`,
    );
  }

  assertNonEmptyString(value.text, `${section}[${index}].text`, 10, 300);

  if (!VALID_EMOTIONS.includes(value.emotion as EmotionTag)) {
    throw new ScriptValidationError(
      `${section}[${index}].emotion`,
      `must be one of: ${VALID_EMOTIONS.join(", ")}`,
    );
  }

  validateStageDirection(value.stage_direction, `${section}[${index}].stage_direction`);
}

function validateSection(
  section: unknown,
  name: keyof Pick<PodcastScript, "intro_banter" | "main_discussion" | "hot_takes" | "outro">,
  minTurns: number,
  maxTurns: number,
): asserts section is DialogueTurn[] {
  if (!Array.isArray(section)) {
    throw new ScriptValidationError(name, "must be an array");
  }

  if (section.length < minTurns) {
    throw new ScriptValidationError(name, `needs at least ${minTurns} turns, got ${section.length}`);
  }

  if (section.length > maxTurns) {
    throw new ScriptValidationError(name, `needs at most ${maxTurns} turns, got ${section.length}`);
  }

  section.forEach((turn, index) => validateTurn(turn, index, name));
}

export function validateScript(data: unknown): asserts data is PodcastScript {
  if (typeof data !== "object" || data === null) {
    throw new ScriptValidationError("root", "must be an object");
  }

  const obj = data as Record<string, unknown>;

  assertNonEmptyString(obj.topic, "topic", 3, 120);
  assertNonEmptyString(obj.episode_title, "episode_title", 5, 120);
  assertNonEmptyString(obj.show_notes, "show_notes", 50, 300);

  validateSection(obj.intro_banter, "intro_banter", 3, 5);
  validateSection(obj.main_discussion, "main_discussion", 10, 20);
  validateSection(obj.hot_takes, "hot_takes", 4, 8);
  validateSection(obj.outro, "outro", 2, 4);

  if (typeof obj.fake_sponsor !== "object" || obj.fake_sponsor === null) {
    throw new ScriptValidationError("fake_sponsor", "must be an object");
  }

  const sponsor = obj.fake_sponsor as Record<string, unknown>;
  assertNonEmptyString(sponsor.name, "fake_sponsor.name", 3, 60);
  assertNonEmptyString(sponsor.tagline, "fake_sponsor.tagline", 5, 120);
  assertNonEmptyString(sponsor.read, "fake_sponsor.read", 25, 400);
}

export function calculateCharacterBudget(script: PodcastScript): ScriptCharacterBudget {
  const bySpeaker: Record<Speaker, number> = {
    chad: 0,
    marina: 0,
  };

  const bySection: Record<string, number> = {};
  const sections = [
    ["intro_banter", script.intro_banter],
    ["main_discussion", script.main_discussion],
    ["hot_takes", script.hot_takes],
    ["outro", script.outro],
  ] as const;

  let total = 0;

  for (const [sectionName, turns] of sections) {
    let sectionTotal = 0;

    for (const turn of turns) {
      const length = turn.text.length;
      bySpeaker[turn.speaker] += length;
      sectionTotal += length;
      total += length;
    }

    bySection[sectionName] = sectionTotal;
  }

  const sponsorLength = script.fake_sponsor.read.length;
  total += sponsorLength;
  bySection.sponsor_read = sponsorLength;

  return { total, bySpeaker, bySection };
}
