export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12">
      <section className="w-full rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_18px_60px_rgba(55,36,22,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">
          Admin Dashboard
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Generation controls land in Phase 7.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          This route is scaffolded so the project structure already matches the spec. The
          episode trigger UI, credit monitoring, and generation status panels can plug in
          here once the pipeline phases are complete.
        </p>
      </section>
    </main>
  );
}
