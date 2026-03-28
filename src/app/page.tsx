export default function Home() {
  const phaseOneTasks = [
    "Next.js App Router scaffold",
    "SQLite + Prisma foundation",
    "ElevenLabs and Anthropic wrappers",
    "Audio asset directory tree",
    "Voice creation and smoke-test scripts",
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-10 sm:px-10 lg:px-12">
      <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_80px_rgba(55,36,22,0.08)] backdrop-blur">
        <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.4fr_0.9fr] lg:px-10 lg:py-10">
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-[var(--border)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]">
              Phase 1 Scaffold
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Confidently Wrong is ready for its ridiculous production pipeline.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                The Next.js app is initialized with TypeScript, App Router, Tailwind,
                Prisma, local SQLite, and the first-pass API wrappers for your podcast
                generation workflow.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-[var(--accent)] px-4 py-2 font-medium text-white">
                Next.js 16
              </span>
              <span className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2">
                React 19
              </span>
              <span className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2">
                Prisma + SQLite
              </span>
              <span className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2">
                ElevenLabs + Anthropic
              </span>
            </div>
          </div>

          <aside className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--accent-strong)]">
              Phase 1 Checklist
            </p>
            <ul className="mt-5 space-y-3">
              {phaseOneTasks.map((task) => (
                <li
                  key={task}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3"
                >
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                  <span className="text-sm leading-6 text-[var(--foreground)]">{task}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_40px_rgba(55,36,22,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
            What Works Now
          </p>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Local app shell, dependency graph, schema definitions, env plumbing, voice
            bootstrap scripts, and the initial audio pipeline building blocks.
          </p>
        </article>

        <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_40px_rgba(55,36,22,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
            Manual Finish Line
          </p>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Add your API keys to <code>.env.local</code>, run the voice creation script,
            paste the returned voice IDs, and then execute the smoke test.
          </p>
        </article>

        <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_40px_rgba(55,36,22,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
            Next Phase
          </p>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Once the smoke test passes, you can move straight into Phase 2 and tune the
            structured script-generation prompt for Chad and Marina.
          </p>
        </article>
      </section>
    </main>
  );
}
