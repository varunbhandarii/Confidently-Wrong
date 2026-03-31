import EpisodeCard from "./EpisodeCard";
import type { PublicEpisodeSummary } from "@/lib/view-models";

interface EpisodeListProps {
  episodes: PublicEpisodeSummary[];
}

export default function EpisodeList({ episodes }: EpisodeListProps) {
  if (episodes.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 rounded-full bg-[var(--accent-soft)] p-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </div>
        <p className="text-sm text-[var(--text-muted)]">No episodes yet. Check back for the next perfectly incorrect dispatch.</p>
      </div>
    );
  }

  return (
    <div className="stagger-list space-y-4">
      {episodes.map((episode) => (
        <EpisodeCard key={episode.id} episode={episode} />
      ))}
    </div>
  );
}
