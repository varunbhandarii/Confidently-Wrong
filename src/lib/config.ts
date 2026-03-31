function requireEnv(key: string): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }

  return value;
}

function optionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

function parseInteger(key: string, fallback: number): number {
  const rawValue = process.env[key];

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Expected ${key} to be an integer, received "${rawValue}"`);
  }

  return parsed;
}

export const config = {
  elevenlabs: {
    get apiKey() {
      return requireEnv("ELEVENLABS_API_KEY");
    },
    get chadVoiceId() {
      return optionalEnv("CHAD_VOICE_ID");
    },
    get marinaVoiceId() {
      return optionalEnv("MARINA_VOICE_ID");
    },
  },
  anthropic: {
    get apiKey() {
      return requireEnv("ANTHROPIC_API_KEY");
    },
    get model() {
      return process.env.LLM_MODEL?.trim() || "claude-sonnet-4-6";
    },
    get maxTokens() {
      return parseInteger("LLM_MAX_TOKENS", 4096);
    },
  },
  app: {
    get adminPassword() {
      return requireEnv("ADMIN_PASSWORD");
    },
    get baseUrl() {
      return process.env.BASE_URL?.trim() || "http://localhost:3000";
    },
    get creditBudget() {
      return parseInteger("CREDIT_BUDGET", 100000);
    },
  },
  memelord: {
    get apiKey() {
      return optionalEnv("MEMELORD_API_KEY") ?? "";
    },
    get enabled() {
      return Boolean(optionalEnv("MEMELORD_API_KEY"));
    },
  },
} as const;

export function requireVoiceId(speaker: "chad" | "marina"): string {
  const voiceId =
    speaker === "chad" ? config.elevenlabs.chadVoiceId : config.elevenlabs.marinaVoiceId;

  if (!voiceId) {
    throw new Error(`Missing required voice ID for ${speaker}`);
  }

  return voiceId;
}
