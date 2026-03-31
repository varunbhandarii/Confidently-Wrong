import SubscribeBar from "./SubscribeBar";
import { formatDurationLabel } from "@/lib/formatters";
import type { PublicEpisodeSummary } from "@/lib/view-models";

interface HeroBannerProps {
  latestEpisode: PublicEpisodeSummary | null;
  feedUrl: string;
  publishedCount: number;
  pendingTopics: number;
}

export default function HeroBanner({ latestEpisode, feedUrl, publishedCount, pendingTopics }: HeroBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 lg:p-10">
      {/* Animated background blobs */}
      <div className="absolute inset-0 -z-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.15),transparent_65%)] blur-3xl animate-float" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.1),transparent_70%)] blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3.5 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-[signalPulse_2s_ease-in-out_infinite]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">On Air</span>
            </div>
            <h1 className="font-display max-w-4xl text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
              <span className="gradient-text">Confidently</span>
              <br />
              <span className="text-[var(--text)]">Wrong</span>
            </h1>
            <p className="max-w-xl text-base leading-7 text-[var(--text-muted)] sm:text-lg">
              Two AI hosts arrive fully certain, catastrophically misinformed, and
              somehow polished enough to sound like a real show.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2">
              <span className="font-mono text-lg font-bold text-[var(--accent)]">{publishedCount}</span>
              <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Episodes</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2">
              <span className="font-mono text-lg font-bold text-[var(--accent)]">{pendingTopics}</span>
              <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">In Queue</span>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-xs text-[var(--text-faint)]">
              Best with headphones & lowered standards
            </div>
          </div>

          <SubscribeBar feedUrl={feedUrl} />
        </div>

        {/* Now Playing card */}
        <div className="glass-card-raised p-6 animate-glow-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="eq-bars playing">
              <span /><span /><span /><span />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
              Now Playing
            </span>
          </div>
          {latestEpisode ? (
            <>
              <h2 className="font-display text-2xl leading-tight text-[var(--text)] sm:text-3xl">
                {latestEpisode.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)] line-clamp-3">
                {latestEpisode.showNotes}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--surface-bright)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
                  EP {String(latestEpisode.episodeNumber).padStart(3, "0")}
                </span>
                <span className="rounded-full bg-[var(--surface-bright)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
                  {formatDurationLabel(latestEpisode.durationSeconds)}
                </span>
                <a
                  href="#episodes"
                  className="ml-auto inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--accent-hover)] hover:shadow-[0_0_20px_var(--accent-glow)]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  Listen
                </a>
              </div>
            </>
          ) : (
            <div className="py-4">
              <p className="text-sm leading-7 text-[var(--text-muted)]">
                The booth is warming up. The first episode of glorious wrongness is on its way.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
