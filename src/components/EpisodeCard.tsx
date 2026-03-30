import AudioPlayer from "./AudioPlayer";
import { formatDurationLabel, formatEpisodeDate } from "@/lib/formatters";
import type { PublicEpisodeSummary } from "@/lib/view-models";

interface EpisodeCardProps {
  episode: PublicEpisodeSummary;
}

export default function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <article className="rounded-[1.8rem] border border-[var(--border)] bg-[rgba(255,252,246,0.88)] p-5 shadow-[0_24px_60px_rgba(58,39,23,0.08)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--accent-strong)]">
            Episode {String(episode.episodeNumber).padStart(3, "0")}
          </p>
          <h3 className="font-display max-w-2xl text-2xl leading-tight text-[var(--night)] sm:text-[2rem]">
            {episode.title}
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">{episode.showNotes}</p>
        </div>

        <dl className="grid min-w-[170px] gap-3 text-sm text-[var(--muted)] sm:text-right">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.28em]">Published</dt>
            <dd className="mt-1 text-[var(--foreground)]">{formatEpisodeDate(episode.publishedAt)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.28em]">Runtime</dt>
            <dd className="mt-1 text-[var(--foreground)]">{formatDurationLabel(episode.durationSeconds)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 space-y-4">
        {episode.audioUrl ? (
          <AudioPlayer src={episode.audioUrl} title={episode.title} />
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-5 text-sm italic text-[var(--muted)]">
            Audio is still routing through the control room.
          </p>
        )}

        {episode.sponsor ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] bg-[rgba(18,22,32,0.92)] px-4 py-3 text-sm text-white">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[rgba(255,215,176,0.78)]">Fake Sponsor</p>
              <p className="mt-1 font-medium">{episode.sponsor.name}</p>
            </div>
            <p className="max-w-xl text-right text-[rgba(255,244,232,0.9)]">{episode.sponsor.tagline}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

