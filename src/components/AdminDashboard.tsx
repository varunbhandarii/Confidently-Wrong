"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";

import { formatBytes, formatDurationLabel, formatEpisodeDate, formatRelativeTime } from "@/lib/formatters";
import type { PipelineStatusSnapshot, PublicTopicSummary } from "@/lib/view-models";

interface AdminDashboardProps {
  initialStatus: PipelineStatusSnapshot;
  initialTopics: PublicTopicSummary[];
}

async function fetchAdminSnapshot(): Promise<{
  status: PipelineStatusSnapshot;
  topics: PublicTopicSummary[];
}> {
  const [statusResponse, topicsResponse] = await Promise.all([
    fetch("/api/status", { cache: "no-store" }),
    fetch("/api/topics", { cache: "no-store" }),
  ]);

  if (!statusResponse.ok || !topicsResponse.ok) {
    throw new Error("Unable to refresh dashboard state.");
  }

  return {
    status: (await statusResponse.json()) as PipelineStatusSnapshot,
    topics: (await topicsResponse.json()) as PublicTopicSummary[],
  };
}

function toneForPercent(percent: number): string {
  if (percent >= 80) return "bg-[var(--danger)]";
  if (percent >= 50) return "bg-[var(--warning)]";
  return "bg-[var(--success)]";
}

function toneTextForPercent(percent: number): string {
  if (percent >= 80) return "text-[var(--danger)]";
  if (percent >= 50) return "text-[var(--warning)]";
  return "text-[var(--success)]";
}

function statusBadgeStyle(status: string): string {
  switch (status) {
    case "published":
      return "border-[var(--success-glow)] bg-[var(--success-glow)] text-[var(--success)]";
    case "mixing":
      return "border-[var(--accent-glow)] bg-[var(--accent-soft)] text-[var(--accent)]";
    case "failed":
      return "border-[var(--live-glow)] bg-[rgba(239,68,68,0.1)] text-[var(--danger)]";
    default:
      return "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]";
  }
}

export default function AdminDashboard({ initialStatus, initialTopics }: AdminDashboardProps) {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [topics, setTopics] = useState(initialTopics);
  const [topic, setTopic] = useState("");
  const [generateMessage, setGenerateMessage] = useState("");
  const [adminError, setAdminError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const mixedEpisodes = useMemo(
    () => status.recentEpisodes.filter((episode) => episode.status === "mixing"),
    [status.recentEpisodes],
  );

  useEffect(() => {
    if (!authed) {
      return;
    }

    const refreshDashboard = async () => {
      try {
        const payload = await fetchAdminSnapshot();
        setStatus(payload.status);
        setTopics(payload.topics);
      } catch {
        // Keep the current dashboard state if refresh fails.
      }
    };

    void refreshDashboard();
    const intervalId = window.setInterval(() => {
      void refreshDashboard();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [authed]);

  async function generateEpisode() {
    setIsGenerating(true);
    setAdminError("");
    setGenerateMessage("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          topic: topic.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        details?: string;
        title?: string;
        assembly?: { durationSeconds: number };
        episodeNumber?: number;
      };

      if (!response.ok) {
        throw new Error(payload.details || payload.error || "Generation failed.");
      }

      setTopic("");
      setGenerateMessage(
        `EP ${String(payload.episodeNumber).padStart(3, "0")} reached the mixing desk: ${payload.title} (${formatDurationLabel(Math.round(payload.assembly?.durationSeconds || 0))}).`,
      );
      try {
        const snapshot = await fetchAdminSnapshot();
        startTransition(() => {
          setStatus(snapshot.status);
          setTopics(snapshot.topics);
        });
      } catch {
        // Keep the success state even if the dashboard refresh fails.
      }
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function publishEpisodes(episodeId?: string) {
    setIsPublishing(true);
    setAdminError("");

    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, episodeId }),
      });

      const payload = (await response.json()) as { error?: string; details?: string; published?: Array<{ title: string }> };
      if (!response.ok) {
        throw new Error(payload.details || payload.error || "Publishing failed.");
      }

      setGenerateMessage(
        payload.published && payload.published.length > 0
          ? `Published ${payload.published.length} episode${payload.published.length > 1 ? "s" : ""} to the feed.`
          : "Nothing needed publishing.",
      );
      try {
        const snapshot = await fetchAdminSnapshot();
        startTransition(() => {
          setStatus(snapshot.status);
          setTopics(snapshot.topics);
        });
      } catch {
        // Keep the success state even if the dashboard refresh fails.
      }
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Publishing failed.");
    } finally {
      setIsPublishing(false);
    }
  }

  // ----- Login screen -----
  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12 sm:px-10">
        <section className="w-full glass-card-raised p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Admin</p>
              <h1 className="font-display text-2xl text-[var(--text)]">Control Room</h1>
            </div>
          </div>

          <p className="mb-6 text-sm leading-6 text-[var(--text-muted)]">
            Enter the admin password to access the production cockpit.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && password.trim()) {
                  setAuthed(true);
                }
              }}
              placeholder="Password"
              className="min-h-11 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
            <button
              type="button"
              onClick={() => setAuthed(true)}
              disabled={!password.trim()}
              className="min-h-11 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--accent-hover)] hover:shadow-[0_0_20px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Unlock
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ----- Dashboard -----
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Production Cockpit</p>
            <h1 className="font-display text-2xl text-[var(--text)]">Generate, Monitor, Publish</h1>
          </div>
        </div>
        <Link href="/" className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
          &larr; Back to Site
        </Link>
      </div>

      {/* Generation controls */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card p-6">
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Generate takes an episode all the way to the mixing stage. Publish pushes mixed files into the RSS feed.
          </p>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Topic override (blank = top voted)"
              className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
            <button
              type="button"
              onClick={() => { void generateEpisode(); }}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 min-h-11 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--accent-hover)] hover:shadow-[0_0_20px_var(--accent-glow)] disabled:opacity-40"
            >
              {isGenerating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : "Generate Episode"}
            </button>
            <button
              type="button"
              onClick={() => { void publishEpisodes(); }}
              disabled={isPublishing || mixedEpisodes.length === 0}
              className="min-h-11 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
            >
              {isPublishing ? "Publishing..." : `Publish All (${mixedEpisodes.length})`}
            </button>
          </div>

          {generateMessage ? (
            <p className="mt-4 rounded-lg bg-[var(--success-glow)] px-3 py-2 text-sm font-medium text-[var(--success)]">
              {generateMessage}
            </p>
          ) : null}
          {adminError ? (
            <p className="mt-4 rounded-lg bg-[rgba(239,68,68,0.1)] px-3 py-2 text-sm font-medium text-[var(--danger)]">
              {adminError}
            </p>
          ) : null}
        </div>

        {/* Credit monitor */}
        <div className="glass-card-raised p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Credits</p>
              <h2 className={`font-display text-3xl ${toneTextForPercent(status.credits.percentUsed)}`}>
                {status.credits.percentUsed}%
              </h2>
            </div>
            <span className="rounded-lg bg-[var(--surface)] px-3 py-1.5 font-mono text-xs text-[var(--text-muted)]">
              {status.credits.used.toLocaleString()} / {status.credits.budget.toLocaleString()}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface)]">
            <div
              className={`h-full rounded-full transition-all duration-700 ${toneForPercent(status.credits.percentUsed)}`}
              style={{ width: `${Math.min(status.credits.percentUsed, 100)}%` }}
            />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[var(--surface)] p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">Pending</p>
              <p className="mt-1 font-mono text-xl font-bold text-[var(--text)]">{status.pendingPublishCount}</p>
            </div>
            <div className="rounded-xl bg-[var(--surface)] p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">SFX Cache</p>
              <p className="mt-1 font-mono text-xl font-bold text-[var(--text)]">{status.cache.sfx}</p>
            </div>
            <div className="rounded-xl bg-[var(--surface)] p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">Cache Size</p>
              <p className="mt-1 font-mono text-xl font-bold text-[var(--text)]">{formatBytes(status.cache.totalSizeBytes)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Active pipeline banner */}
      {status.generating ? (
        <section className="rounded-xl border border-[var(--accent-glow)] bg-[var(--accent-soft)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--live)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
              <span className="h-2 w-2 rounded-full bg-white animate-[signalPulse_1.2s_ease-in-out_infinite]" />
              Live
            </span>
            <p className="text-sm font-medium text-[var(--text)]">
              EP {String(status.generating.episodeNumber).padStart(3, "0")} &mdash; {status.generating.status} for &ldquo;{status.generating.topicTitle}&rdquo;
            </p>
            <span className="text-xs text-[var(--text-muted)]">{formatRelativeTime(status.generating.createdAt)}</span>
          </div>
        </section>
      ) : null}

      {/* Episode ledger + Sidebar */}
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Episode ledger */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Episode Ledger</p>
              <h2 className="mt-1 font-display text-2xl text-[var(--text)]">Recent output</h2>
            </div>
            <span className="rounded-full bg-[var(--surface-bright)] px-3 py-1 font-mono text-xs font-bold text-[var(--text-muted)]">
              {status.publishedCount} published
            </span>
          </div>

          <div className="stagger-list space-y-3">
            {status.recentEpisodes.map((episode) => (
              <div key={episode.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:bg-[var(--surface-raised)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 font-mono text-xs font-bold text-[var(--accent)]">
                      {String(episode.episodeNumber).padStart(3, "0")}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">{episode.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-faint)]">{episode.topicTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBadgeStyle(episode.status)}`}>
                      {episode.status}
                    </span>
                    {episode.status === "mixing" ? (
                      <button
                        type="button"
                        onClick={() => { void publishEpisodes(episode.id); }}
                        disabled={isPublishing}
                        className="rounded-lg bg-[var(--accent)] px-3 py-1 text-[11px] font-bold text-white transition-all hover:bg-[var(--accent-hover)] disabled:opacity-40"
                      >
                        Publish
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-faint)]">
                  <span>{episode.publishedAt ? formatEpisodeDate(episode.publishedAt) : formatRelativeTime(episode.createdAt)}</span>
                  <span>{formatDurationLabel(episode.durationSeconds)}</span>
                  <span className="font-mono">{episode.charactersUsed.toLocaleString()} chars</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Queue + Budget */}
        <div className="space-y-6">
          {/* Queue */}
          <section className="glass-card p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Queue</p>
                <h2 className="mt-1 font-display text-xl text-[var(--text)]">Pending topics</h2>
              </div>
              <span className="font-mono text-xs text-[var(--text-faint)]">{topics.length} total</span>
            </div>
            <div className="space-y-2">
              {topics.length === 0 ? (
                <p className="py-4 text-center text-sm text-[var(--text-faint)]">Queue is empty.</p>
              ) : (
                topics.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--text)]">{entry.title}</p>
                      {entry.description ? <p className="mt-0.5 truncate text-xs text-[var(--text-faint)]">{entry.description}</p> : null}
                    </div>
                    <span className="shrink-0 rounded-lg bg-[var(--surface-bright)] px-2 py-1 font-mono text-xs font-bold text-[var(--text-muted)]">
                      {entry.votes}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Budget drilldown */}
          <section className="glass-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Budget Drilldown</p>
            <h2 className="mt-1 font-display text-xl text-[var(--text)]">Recent spend</h2>
            <div className="mt-4 space-y-2">
              {status.credits.episodeBreakdown.slice(0, 5).map((entry) => (
                <div key={entry.episodeId} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--text)]">{entry.topic}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${statusBadgeStyle(entry.status)} rounded px-1.5 py-0.5`}>
                      {entry.status}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">{entry.characters.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}


