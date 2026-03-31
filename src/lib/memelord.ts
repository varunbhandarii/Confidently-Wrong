import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { config } from "./config";

const MEMELORD_API_URL = "https://www.memelord.com/api/v1/ai-meme";
const MEME_OUTPUT_DIR = path.join(process.cwd(), "public", "images", "memes");

interface MemelordResult {
  success: boolean;
  url: string;
  expires_in: number;
  template_name: string;
  template_id: string;
}

interface MemelordResponse {
  success: boolean;
  prompt: string;
  total_generated: number;
  results?: MemelordResult[];
}

export interface GeneratedMeme {
  localPath: string;
  publicUrl: string;
  templateName: string;
  prompt: string;
}

function inferFileExtension(contentType: string | null): string {
  if (contentType?.includes("png")) {
    return "png";
  }

  if (contentType?.includes("webp")) {
    return "webp";
  }

  return "jpg";
}

export async function generateMeme(prompt: string, episodeId: string): Promise<GeneratedMeme | null> {
  if (!config.memelord.enabled) {
    console.log("  [memelord] Skipped (no API key)");
    return null;
  }

  try {
    console.log(`  [memelord] Generating meme from prompt: "${prompt.slice(0, 72)}${prompt.length > 72 ? "..." : ""}"`);

    const response = await fetch(MEMELORD_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.memelord.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        count: 1,
        category: "classic",
        include_nsfw: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Memelord API error: ${response.status}`);
    }

    const payload = (await response.json()) as MemelordResponse;
    const result = payload.results?.find((entry) => entry.success);

    if (!payload.success || !result?.url) {
      throw new Error("Memelord returned no meme results.");
    }

    const imageResponse = await fetch(result.url);

    if (!imageResponse.ok) {
      throw new Error(`Failed to download meme image: ${imageResponse.status}`);
    }

    const fileExtension = inferFileExtension(imageResponse.headers.get("content-type"));
    const fileName = `${episodeId}.${fileExtension}`;
    const localPath = `/images/memes/${fileName}`;
    const outputPath = path.join(MEME_OUTPUT_DIR, fileName);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    await mkdir(MEME_OUTPUT_DIR, { recursive: true });
    await writeFile(outputPath, imageBuffer);

    console.log(`  [memelord] Saved ${localPath} using template "${result.template_name}"`);

    return {
      localPath,
      publicUrl: new URL(localPath, config.app.baseUrl).toString(),
      templateName: result.template_name,
      prompt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`  [memelord] Failed: ${message}`);
    return null;
  }
}
