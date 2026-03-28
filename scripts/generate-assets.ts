import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const [{ REUSABLE_ASSETS }, { generateReusableAsset }, { getCacheStats }] = await Promise.all([
    import("../src/lib/audio-prompts"),
    import("../src/lib/audio-generator"),
    import("../src/lib/audio-cache"),
  ]);

  console.log("Generating reusable audio assets...\n");

  for (const asset of REUSABLE_ASSETS) {
    console.log(`Asset: ${asset.id} (${asset.generator})`);
    const filePath = await generateReusableAsset(asset);
    console.log(`  -> ${filePath}\n`);
  }

  const stats = await getCacheStats();
  console.log("Cache stats:");
  console.log(`  Jingles: ${stats.jingles}`);
  console.log(`  Transitions: ${stats.transitions}`);
  console.log(`  SFX: ${stats.sfx}`);
  console.log(`  Total size: ${(stats.totalSizeBytes / 1024).toFixed(0)} KB`);
}

main().catch((error) => {
  console.error("Reusable asset generation failed:", error);
  process.exit(1);
});