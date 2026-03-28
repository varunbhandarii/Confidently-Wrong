export interface AudioAssetPrompt {
  id: string;
  generator: "music" | "sfx";
  cacheType: "jingle" | "transition";
  prompt: string;
  description: string;
  reusable: true;
  durationSeconds: number;
  forceInstrumental?: boolean;
  promptInfluence?: number;
}

export interface SfxPromptTemplate {
  prompt: string;
  durationSeconds?: number;
  promptInfluence?: number;
  loop?: boolean;
}

export const REUSABLE_ASSETS: AudioAssetPrompt[] = [
  {
    id: "intro_jingle",
    generator: "music",
    cacheType: "jingle",
    prompt:
      "Upbeat, cheesy, 15-second podcast intro jingle. Overly enthusiastic synth energy like a bad 1990s morning show. Builds to a brief climax then cuts clean.",
    description: "Episode intro music",
    reusable: true,
    durationSeconds: 15,
    forceInstrumental: true,
  },
  {
    id: "outro_jingle",
    generator: "music",
    cacheType: "jingle",
    prompt:
      "Melancholic, deflating 10-second podcast outro. Gentle piano trailing off into awkward nothingness. The musical equivalent of well, that happened.",
    description: "Episode outro music",
    reusable: true,
    durationSeconds: 10,
    forceInstrumental: true,
  },
  {
    id: "transition_1",
    generator: "sfx",
    cacheType: "transition",
    prompt: "Short whoosh transition sound effect, 2 seconds, clean, radio broadcast style",
    description: "Segment transition",
    reusable: true,
    durationSeconds: 2,
    promptInfluence: 0.55,
  },
  {
    id: "transition_2",
    generator: "sfx",
    cacheType: "transition",
    prompt: "Brief comedic dun dun dun dramatic reveal stinger, 2 seconds",
    description: "Dramatic transition",
    reusable: true,
    durationSeconds: 2,
    promptInfluence: 0.6,
  },
  {
    id: "transition_3",
    generator: "sfx",
    cacheType: "transition",
    prompt: "Quick vinyl record scratch transition effect, 1 second",
    description: "Scratch transition",
    reusable: true,
    durationSeconds: 1,
    promptInfluence: 0.65,
  },
];

export const SFX_PROMPT_MAP: Record<string, SfxPromptTemplate> = {
  "sad trombone": {
    prompt: "Classic sad trombone wah wah wah comedy failure sound",
    durationSeconds: 2,
    promptInfluence: 0.75,
  },
  thunder: {
    prompt: "Single dramatic thunder crack, cinematic, 2 seconds",
    durationSeconds: 2,
    promptInfluence: 0.55,
  },
  "thunder crash": {
    prompt: "Single dramatic thunder crack, cinematic, 2 seconds",
    durationSeconds: 2,
    promptInfluence: 0.55,
  },
  crickets: {
    prompt: "Awkward silence crickets chirping, comedy timing, 3 seconds",
    durationSeconds: 3,
    promptInfluence: 0.6,
  },
  "dramatic strings": {
    prompt: "Tense orchestral string hit, horror movie reveal sting, 2 seconds",
    durationSeconds: 2,
    promptInfluence: 0.6,
  },
  "ominous strings": {
    prompt: "Tense orchestral string hit, horror movie reveal sting, 2 seconds",
    durationSeconds: 2,
    promptInfluence: 0.6,
  },
  "air horn": {
    prompt: "Loud obnoxious air horn blast, celebration, 1 second",
    durationSeconds: 1,
    promptInfluence: 0.7,
  },
  "record scratch": {
    prompt: "Vinyl record scratch, sudden stop, comedic interruption",
    durationSeconds: 1,
    promptInfluence: 0.7,
  },
  applause: {
    prompt: "Small studio audience polite applause, 3 seconds",
    durationSeconds: 3,
    promptInfluence: 0.45,
  },
  boing: {
    prompt: "Cartoon spring boing sound effect, comedic, 1 second",
    durationSeconds: 1,
    promptInfluence: 0.75,
  },
  explosion: {
    prompt: "Cartoon explosion, over the top, not realistic, 2 seconds",
    durationSeconds: 2,
    promptInfluence: 0.55,
  },
  "dial up": {
    prompt: "Classic 1990s dial-up modem connection sound, 3 seconds",
    durationSeconds: 3,
    promptInfluence: 0.7,
  },
  "glass breaking": {
    prompt: "Single wine glass shattering on floor, dramatic, 1 second",
    durationSeconds: 1,
    promptInfluence: 0.65,
  },
  suspense: {
    prompt: "Building suspense strings, tension rising, 3 seconds",
    durationSeconds: 3,
    promptInfluence: 0.55,
  },
  fail: {
    prompt: "Game show wrong answer buzzer, descending pitch, 2 seconds",
    durationSeconds: 2,
    promptInfluence: 0.75,
  },
  success: {
    prompt: "Triumphant short fanfare, game show correct answer, 2 seconds",
    durationSeconds: 2,
    promptInfluence: 0.7,
  },
  gasp: {
    prompt: "Dramatic audience gasp, theatrical, 1 second",
    durationSeconds: 1,
    promptInfluence: 0.55,
  },
  drone: {
    prompt: "Low ominous drone, cinematic tension bed, 2 seconds",
    durationSeconds: 2,
    promptInfluence: 0.45,
  },
  pigeons: {
    prompt: "A flock of pigeons cooing close to the microphone, comedic and obvious, 2 seconds",
    durationSeconds: 2,
    promptInfluence: 0.65,
  },
  violin: {
    prompt: "Sharp dramatic violin sting, sudden reveal, 1 second",
    durationSeconds: 1,
    promptInfluence: 0.6,
  },
  typing: {
    prompt: "Fast frantic keyboard typing, exaggerated and punchy, 2 seconds",
    durationSeconds: 2,
    promptInfluence: 0.55,
  },
  "startup jingle": {
    prompt: "Short absurd startup logo stinger with synth pluck and smug optimism, 2 seconds",
    durationSeconds: 2,
    promptInfluence: 0.65,
  },
};