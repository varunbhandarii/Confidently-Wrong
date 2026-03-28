import path from "node:path";
import { execFileSync } from "node:child_process";

import type { PodcastScript } from "./types";

export interface EpisodeMetadata {
  episodeNumber: number;
  script: PodcastScript;
  durationSeconds: number;
}

function sanitizeMetadata(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/"/g, "'").trim();
}

export function tagEpisode(inputPath: string, outputPath: string, metadata: EpisodeMetadata): void {
  const title = sanitizeMetadata(
    `Confidently Wrong - Ep. ${metadata.episodeNumber}: ${metadata.script.episode_title}`,
  );
  const comment = sanitizeMetadata(metadata.script.show_notes);

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      path.resolve(inputPath),
      "-codec",
      "copy",
      "-metadata",
      `title=${title}`,
      "-metadata",
      "artist=Chad & Marina",
      "-metadata",
      "album=Confidently Wrong",
      "-metadata",
      "genre=Comedy",
      "-metadata",
      `comment=${comment}`,
      "-metadata",
      `track=${metadata.episodeNumber}`,
      "-metadata",
      `date=${new Date().getFullYear()}`,
      path.resolve(outputPath),
    ],
    { stdio: "pipe" },
  );
}
