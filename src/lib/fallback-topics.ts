export const FALLBACK_TOPICS: string[] = [
  "Is cereal a soup?",
  "Should dogs have jobs?",
  "The geopolitics of pizza toppings",
  "Are clouds just sky pillows?",
  "Why don't fish get thirsty?",
  "Is a hot dog a sandwich?",
  "Should we give dolphins voting rights?",
  "The conspiracy behind left-handedness",
  "Are plants just very patient animals?",
  "Why don't we have a president of the moon?",
  "Is math real or did we make it up?",
  "The hidden agenda behind alphabet order",
  "Should gravity be optional?",
  "Are birds government surveillance drones?",
  "The untold economic impact of napping",
  "Why doesn't glue stick to the inside of the bottle?",
  "Is water just boneless ice?",
  "The startup potential of competitive sleeping",
  "Should we abolish Mondays?",
  "The dark truth about pillows",
];

export function getRandomTopic(): string {
  return FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)];
}
