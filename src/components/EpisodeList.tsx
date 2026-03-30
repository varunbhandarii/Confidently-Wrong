import EpisodeCard from "./EpisodeCard";
import type { PublicEpisodeSummary } from "@/lib/view-models";

interface EpisodeListProps {
  episodes: PublicEpisodeSummary[];
}

export default function EpisodeList({ episodes }: EpisodeListProps) {
  if (episodes.length === 0) {
    return (
      <p className="rounded-[1.5rem] border border-dashed border-[var(--border)] px-5 py-6 text-sm italic text-[var(--muted)]">
        No episodes yet. Check back soon for the next perfectly incorrect dispatch.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {episodes.map((episode) => (
        <EpisodeCard key={episode.id} episode={episode} />
      ))}
    </div>
  );
}

