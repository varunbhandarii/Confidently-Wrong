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
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8">
        <HeroBanner
          latestEpisode={episodes[0] ?? null}
          feedUrl={`${config.app.baseUrl}/feed.xml`}
          publishedCount={status.publishedCount}
          pendingTopics={status.pendingTopics}
        />

        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          {/* Episodes column */}
          <div id="episodes" className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                  Episode Archive
                </p>
                <h2 className="mt-2 font-display text-3xl text-[var(--text)] sm:text-4xl">
                  Play the bad takes.
                </h2>
              </div>
              <p className="hidden text-right text-xs leading-5 text-[var(--text-faint)] sm:block">
                Every episode: mixed, tagged, and<br />ready for the feed.
              </p>
            </div>
            <EpisodeList episodes={episodes} />
          </div>

          {/* Topics column */}
          <div id="topics" className="space-y-5">
            {/* Submit topic */}
            <section className="glass-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                    Audience Control
                  </p>
                  <h2 className="font-display text-xl text-[var(--text)]">Feed the next argument.</h2>
                </div>
              </div>
              <p className="mb-4 text-sm leading-6 text-[var(--text-muted)]">
                Suggest a topic and let the booth decide whether Chad or Marina embarrasses themselves first.
              </p>
              <TopicForm />
            </section>

            {/* Vote board */}
            <section className="glass-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m18 15-6-6-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
                      Vote Board
                    </p>
                    <h2 className="font-display text-xl text-[var(--text)]">What should they ruin next?</h2>
                  </div>
                </div>
                <span className="rounded-full bg-[var(--surface-bright)] px-3 py-1 font-mono text-xs font-bold text-[var(--text-muted)]">
                  {topics.length}
                </span>
              </div>
              <TopicVoting initialTopics={topics} />
            </section>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col gap-3 border-t border-[var(--border)] px-1 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[var(--text-faint)]">
            Built for <span className="font-semibold text-[var(--text-muted)]">Silly Hacks 2026</span>. Powered by ElevenLabs.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
            <a href="/feed.xml" target="_blank" rel="noreferrer" className="transition hover:text-[var(--accent)]">
              RSS
            </a>
            <a href="/admin" className="transition hover:text-[var(--accent)]">
              Admin
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}

