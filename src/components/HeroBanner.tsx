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
    <section className="relative overflow-hidden rounded-[2.4rem] border border-[rgba(92,68,46,0.15)] bg-[linear-gradient(135deg,rgba(255,248,239,0.95),rgba(249,235,219,0.88)_45%,rgba(239,217,189,0.88)_100%)] px-6 py-8 shadow-[0_32px_90px_rgba(58,39,23,0.14)] sm:px-8 sm:py-10 lg:px-10">
      <div className="absolute inset-y-0 right-[-140px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(182,76,47,0.26),transparent_65%)] blur-3xl" />
      <div className="absolute left-[-60px] top-[-40px] h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(255,210,146,0.68),transparent_70%)] blur-2xl" />

      <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="inline-flex rounded-full border border-[rgba(109,35,16,0.15)] bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--accent-strong)]">
              Listening Room
            </p>
            <h1 className="font-display max-w-4xl text-5xl leading-none text-[var(--night)] sm:text-6xl lg:text-7xl">
              Confidently Wrong
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
              Chad and Marina arrive fully certain, catastrophically misinformed, and somehow polished enough to sound like a real show.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--accent-strong)]">Published</p>
              <p className="mt-2 font-display text-4xl text-[var(--night)]">{publishedCount}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--accent-strong)]">Pending topics</p>
              <p className="mt-2 font-display text-4xl text-[var(--night)]">{pendingTopics}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--accent-strong)]">Best listened</p>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">On headphones, with your standards lowered appropriately.</p>
            </div>
          </div>

          <SubscribeBar feedUrl={feedUrl} />
        </div>

        <div className="rounded-[1.8rem] border border-[rgba(17,23,32,0.12)] bg-[rgba(17,23,32,0.94)] p-6 text-white shadow-[0_20px_55px_rgba(15,17,24,0.28)]">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[rgba(255,215,176,0.72)]">Now in rotation</p>
          {latestEpisode ? (
            <>
              <h2 className="mt-3 font-display text-3xl leading-tight">{latestEpisode.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[rgba(255,244,232,0.82)]">{latestEpisode.showNotes}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[rgba(255,244,232,0.82)]">
                <span className="rounded-full bg-white/10 px-3 py-1">Episode {String(latestEpisode.episodeNumber).padStart(3, "0")}</span>
                <span className="rounded-full bg-white/10 px-3 py-1">{formatDurationLabel(latestEpisode.durationSeconds)}</span>
                <a href="#episodes" className="rounded-full bg-white px-4 py-2 font-semibold text-[var(--night)] transition hover:bg-[rgba(255,236,214,1)]">
                  Press Play
                </a>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm leading-7 text-[rgba(255,244,232,0.82)]">
              The booth is warming up. Publish one episode and this room becomes a proper listening lounge.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

