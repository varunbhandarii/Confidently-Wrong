export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 sm:py-8">
      <section className="glass-card-raised animate-fade-in-up p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
          Loading
        </p>
        <h1 className="mt-3 font-display text-4xl text-[var(--text)] sm:text-5xl">
          Pulling the next bad take onto the air...
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-muted)]">
          Loading episodes, topics, and the control-room state.
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="glass-card h-56 animate-pulse" />
          <div className="glass-card h-56 animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="glass-card h-52 animate-pulse" />
          <div className="glass-card h-64 animate-pulse" />
        </div>
      </section>
    </main>
  );
}
