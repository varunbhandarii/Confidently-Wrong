import { create } from "xmlbuilder2";

import { config } from "./config";
import { db } from "./db";
import { PODCAST_META, formatDuration } from "./podcast-meta";

type FeedEpisode = {
  id: string;
  episodeNumber: number;
  topicTitle: string;
  scriptJson: string;
  showNotes: string | null;
  audioUrl: string | null;
  audioSizeBytes: number | null;
  durationSeconds: number | null;
  publishedAt: Date | null;
  createdAt: Date;
};

type ParsedEpisodeData = {
  title: string;
  showNotes: string;
};

function resolveAbsoluteUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return new URL(value.startsWith("/") ? value : `/${value}`, config.app.baseUrl).toString();
}

function parseEpisodeData(episode: FeedEpisode): ParsedEpisodeData {
  let title = `Ep. ${episode.episodeNumber}: ${episode.topicTitle}`;
  let showNotes = episode.showNotes?.trim() || `Episode ${episode.episodeNumber} about ${episode.topicTitle}.`;

  try {
    const parsed = JSON.parse(episode.scriptJson) as {
      episode_title?: unknown;
      show_notes?: unknown;
    };

    if (typeof parsed.episode_title === "string" && parsed.episode_title.trim()) {
      title = `Ep. ${episode.episodeNumber}: ${parsed.episode_title.trim()}`;
    }

    if (typeof parsed.show_notes === "string" && parsed.show_notes.trim()) {
      showNotes = parsed.show_notes.trim();
    }
  } catch {
    // Keep DB fallbacks when the stored JSON is not parseable.
  }

  return { title, showNotes };
}

async function getPublishedEpisodes(): Promise<FeedEpisode[]> {
  const episodes = await db.episode.findMany({
    where: {
      status: "published",
      audioUrl: { not: null },
      audioSizeBytes: { not: null },
      durationSeconds: { not: null },
    },
    orderBy: [{ publishedAt: "desc" }, { episodeNumber: "desc" }],
    select: {
      id: true,
      episodeNumber: true,
      topicTitle: true,
      scriptJson: true,
      showNotes: true,
      audioUrl: true,
      audioSizeBytes: true,
      durationSeconds: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return episodes.filter((episode) => episode.audioUrl && episode.audioSizeBytes && episode.durationSeconds !== null);
}

export async function generateFeedXml(): Promise<string> {
  const episodes = await getPublishedEpisodes();
  const lastBuildDate = episodes[0]?.publishedAt ?? episodes[0]?.createdAt ?? new Date();

  const root = create({ version: "1.0", encoding: "UTF-8" }).ele("rss", {
    version: "2.0",
    "xmlns:itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
    "xmlns:atom": "http://www.w3.org/2005/Atom",
    "xmlns:content": "http://purl.org/rss/1.0/modules/content/",
  });

  const channel = root.ele("channel");
  channel.ele("title").txt(PODCAST_META.title).up();
  channel.ele("link").txt(PODCAST_META.link).up();
  channel.ele("description").txt(PODCAST_META.description).up();
  channel.ele("language").txt(PODCAST_META.language).up();
  channel.ele("copyright").txt(PODCAST_META.copyright).up();
  channel.ele("generator").txt("Confidently Wrong RSS Generator").up();
  channel.ele("lastBuildDate").txt(lastBuildDate.toUTCString()).up();
  channel.ele("ttl").txt("60").up();
  channel
    .ele("atom:link", {
      href: PODCAST_META.feedUrl,
      rel: "self",
      type: "application/rss+xml",
    })
    .up();

  channel.ele("itunes:author").txt(PODCAST_META.author).up();
  channel.ele("itunes:summary").txt(PODCAST_META.description).up();
  channel.ele("itunes:subtitle").txt(PODCAST_META.subtitle).up();
  channel.ele("itunes:type").txt(PODCAST_META.type).up();
  channel.ele("itunes:explicit").txt(PODCAST_META.explicit ? "true" : "false").up();
  channel.ele("itunes:image", { href: PODCAST_META.artworkUrl }).up();
  channel
    .ele("itunes:category", { text: PODCAST_META.category })
    .ele("itunes:category", { text: PODCAST_META.subcategory })
    .up()
    .up();
  channel
    .ele("itunes:owner")
    .ele("itunes:name")
    .txt(PODCAST_META.ownerName)
    .up()
    .ele("itunes:email")
    .txt(PODCAST_META.ownerEmail)
    .up()
    .up();

  for (const episode of episodes) {
    if (!episode.audioUrl || episode.audioSizeBytes === null || episode.durationSeconds === null) {
      continue;
    }

    const { title, showNotes } = parseEpisodeData(episode);
    const audioUrl = resolveAbsoluteUrl(episode.audioUrl);
    const pubDate = (episode.publishedAt ?? episode.createdAt).toUTCString();
    const item = channel.ele("item");

    item.ele("title").txt(title).up();
    item.ele("description").dat(showNotes).up();
    item.ele("link").txt(audioUrl).up();
    item.ele("guid", { isPermaLink: "true" }).txt(audioUrl).up();
    item.ele("pubDate").txt(pubDate).up();
    item.ele("enclosure", {
      url: audioUrl,
      length: String(episode.audioSizeBytes),
      type: "audio/mpeg",
    }).up();

    item.ele("itunes:title").txt(title).up();
    item.ele("itunes:author").txt(PODCAST_META.author).up();
    item.ele("itunes:summary").dat(showNotes).up();
    item.ele("itunes:duration").txt(formatDuration(episode.durationSeconds)).up();
    item.ele("itunes:episode").txt(String(episode.episodeNumber)).up();
    item.ele("itunes:episodeType").txt("full").up();
    item.ele("itunes:explicit").txt("false").up();
    item.up();
  }

  return root.end({ prettyPrint: true });
}
