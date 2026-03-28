import { config } from "./config";

const ownerName = process.env.PODCAST_OWNER_NAME?.trim() || "Confidently Wrong Production Desk";
const ownerEmail = process.env.PODCAST_OWNER_EMAIL?.trim() || "team@confidentlywrong.fm";

export const PODCAST_META = {
  title: "Confidently Wrong",
  subtitle: "The podcast where absolute confidence meets catastrophic accuracy.",
  description:
    "Chad, an overconfident tech bro, and Marina, a melodramatic conspiracy theorist, debate topics they absolutely do not understand. Every episode is polished, committed, and deeply, gloriously incorrect.",
  author: "Chad & Marina",
  ownerName,
  ownerEmail,
  language: "en-us",
  category: "Comedy",
  subcategory: "Improv",
  explicit: false,
  type: "episodic" as const,
  copyright: `Copyright ${new Date().getFullYear()} Confidently Wrong`,
  get link() {
    return config.app.baseUrl;
  },
  get feedUrl() {
    return `${config.app.baseUrl}/feed.xml`;
  },
  get artworkUrl() {
    return `${config.app.baseUrl}/images/podcast-cover.jpg`;
  },
} as const;

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
