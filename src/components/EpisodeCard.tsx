import Image from "next/image";

import AudioPlayer from "./AudioPlayer";
import ShareMemeButton from "./ShareMemeButton";
import { formatDurationLabel, formatEpisodeDate } from "@/lib/formatters";
import type { PublicEpisodeSummary } from "@/lib/view-models";

interface EpisodeCardProps {
  episode: PublicEpisodeSummary;
}

export default function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <article className="glass-card p-5 transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] font-mono text-sm font-bold text-[var(--accent)]">
            {String(episode.episodeNumber).padStart(2, "0")}
          </div>
          <div className="space-y-1.5">
            <h3 className="font-display max-w-2xl text-xl leading-tight text-[var(--text)] sm:text-2xl">
              {episode.title}
            </h3>
            <p className="max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{episode.showNotes}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
          <span className="rounded-lg bg-[var(--surface-bright)] px-2.5 py-1 font-medium">
            {formatEpisodeDate(episode.publishedAt)}
          </span>
          <span className="rounded-lg bg-[var(--surface-bright)] px-2.5 py-1 font-medium">
            {formatDurationLabel(episode.durationSeconds)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {episode.audioUrl ? (
          <AudioPlayer src={episode.audioUrl} title={episode.title} />
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] px-4 py-4 text-sm text-[var(--text-faint)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Audio is still routing through the control room.
          </div>
        )}

        {episode.memeUrl ? (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="relative h-72 w-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_rgba(249,115,22,0)_48%),var(--surface-bright)] sm:h-80 lg:h-96">
              <Image
                src={episode.memeUrl}
                alt={`Auto-generated meme for ${episode.title}`}
                fill
                className="object-contain p-3 sm:p-4"
                sizes="(max-width: 768px) 100vw, 720px"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--accent)]">Memelord Drop</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Auto-generated from the wildest quote in the episode.</p>
              </div>
              <ShareMemeButton memeUrl={episode.memeUrl} title={episode.title} />
            </div>
          </div>
        ) : null}

        {episode.sponsor ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface-bright)] px-4 py-3 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--accent)]">Fake Sponsor</p>
              <p className="mt-0.5 font-medium text-[var(--text)]">{episode.sponsor.name}</p>
            </div>
            <p className="text-right text-[var(--text-muted)] italic">&ldquo;{episode.sponsor.tagline}&rdquo;</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
