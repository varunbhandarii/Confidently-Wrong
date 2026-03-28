import { loadEnvConfig } from "@next/env";

import { createVoice } from "../src/lib/elevenlabs";

loadEnvConfig(process.cwd());

const CHAD_DESCRIPTION =
  "Young American man in his 30s. Confident, energetic, slightly nasal, and " +
  "a little too excited by startup jargon. Sounds like a tech founder pitching " +
  "on a podcast with California tech-bro energy.";

const CHAD_SAMPLE =
  "Look, I am not saying cereal is a startup, but if it was, it would definitely " +
  "be a Series B at this point. The TAM is massive.";

const MARINA_DESCRIPTION =
  "Woman in her 40s with a subtle Eastern European accent. Dramatic, breathy, " +
  "mysterious, and conspiratorial, like she is always revealing a dark secret.";

const MARINA_SAMPLE =
  "They do not want you to know this, but cereal was invented by the grain " +
  "cartels to control breakfast. This is documented.";

async function createVoices() {
  console.log("Creating Chad's voice...");
  const chadVoiceId = await createVoice({
    name: "Chad",
    description: CHAD_DESCRIPTION,
    sampleText: CHAD_SAMPLE,
    labels: {
      character: "chad",
      tone: "overconfident-tech-bro",
    },
  });

  console.log("Chad voice ID:", chadVoiceId);

  console.log("\nCreating Marina's voice...");
  const marinaVoiceId = await createVoice({
    name: "Marina",
    description: MARINA_DESCRIPTION,
    sampleText: MARINA_SAMPLE,
    labels: {
      character: "marina",
      tone: "melodramatic-conspiracy-theorist",
    },
  });

  console.log("Marina voice ID:", marinaVoiceId);

  console.log("\nUpdate .env.local with:");
  console.log(`CHAD_VOICE_ID=${chadVoiceId}`);
  console.log(`MARINA_VOICE_ID=${marinaVoiceId}`);
}

createVoices().catch((error) => {
  console.error("Voice creation failed:", error);
  process.exit(1);
});
