import HeroBanner from "@/components/HeroBanner";
import EpisodeList from "@/components/EpisodeList";
import StatusBanner from "@/components/StatusBanner";
import TopicForm from "@/components/TopicForm";
import TopicVoting from "@/components/TopicVoting";
import { config } from "@/lib/config";
import { getPipelineStatus, getPendingTopics, getPublishedEpisodes } from "@/lib/app-data";

export default async function Home() {
  const [episodes, topics, status] = await Promise.all([
    getPublishedEpisodes(),
    getPendingTopics(),
    getPipelineStatus(),
  ]);

  return (
    <>
      <StatusBanner initialStatus={status} />
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-6 sm:px-10 sm:py-8">
        <HeroBanner
          latestEpisode={episodes[0] ?? null}
          feedUrl={`${config.app.baseUrl}/feed.xml`}
          publishedCount={status.publishedCount}
          pendingTopics={status.pendingTopics}
        />

        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div id="episodes" className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--accent-strong)]">Episode archive</p>
                <h2 className="mt-2 font-display text-4xl text-[var(--night)]">Play the bad takes.</h2>
              </div>
              <p className="max-w-xs text-right text-sm leading-6 text-[var(--muted)]">
                Every published episode is already mixed, tagged, and ready for the feed.
              </p>
            </div>
            <EpisodeList episodes={episodes} />
          </div>

          <div id="topics" className="space-y-6">
            <section className="rounded-[1.9rem] border border-[var(--border)] bg-[rgba(255,252,246,0.88)] p-6 shadow-[0_24px_70px_rgba(58,39,23,0.09)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--accent-strong)]">Audience control</p>
              <h2 className="mt-2 font-display text-4xl text-[var(--night)]">Feed the next argument.</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                Suggest a topic, nudge the queue, and let the booth decide whether Chad or Marina embarrasses themselves first.
              </p>
              <div className="mt-5">
                <TopicForm />
              </div>
            </section>

            <section className="rounded-[1.9rem] border border-[var(--border)] bg-[rgba(255,252,246,0.88)] p-6 shadow-[0_24px_70px_rgba(58,39,23,0.09)]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--accent-strong)]">Vote board</p>
                  <h2 className="mt-2 font-display text-4xl text-[var(--night)]">What should they ruin next?</h2>
                </div>
                <span className="rounded-full bg-[rgba(17,23,32,0.92)] px-3 py-1 text-xs font-semibold text-white">
                  {topics.length} live topics
                </span>
              </div>
              <div className="mt-5">
                <TopicVoting initialTopics={topics} />
              </div>
            </section>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-[var(--border)] px-1 py-6 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>Built for Silly Hacks 2026. Press play, laugh once, then inspect the feed.</p>
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.22em]">
            <a href="/feed.xml" target="_blank" rel="noreferrer" className="hover:text-[var(--accent-strong)]">
              RSS
            </a>
            <a href="/admin" className="hover:text-[var(--accent-strong)]">
              Admin
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}

