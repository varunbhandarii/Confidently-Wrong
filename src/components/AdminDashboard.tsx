"use client";

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
  if (percent >= 80) {
    return "bg-[var(--danger)]";
  }

  if (percent >= 50) {
    return "bg-[var(--warning)]";
  }

  return "bg-[var(--success)]";
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
        headers: {
          "Content-Type": "application/json",
        },
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
        `Episode ${String(payload.episodeNumber).padStart(3, "0")} reached the mixing desk: ${payload.title} (${formatDurationLabel(Math.round(payload.assembly?.durationSeconds || 0))}).`,
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
        headers: {
          "Content-Type": "application/json",
        },
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

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12 sm:px-10">
        <section className="w-full rounded-[2rem] border border-[var(--border)] bg-[rgba(255,252,246,0.88)] p-8 shadow-[0_28px_80px_rgba(58,39,23,0.12)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--accent-strong)]">Admin Desk</p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-[var(--night)]">Unlock the control room.</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            The password never leaves this page except on each admin API call. It is intentionally simple because this is still a hackathon cockpit.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && password.trim()) {
                  setAuthed(true);
                }
              }}
              placeholder="Admin password"
              className="min-h-12 flex-1 rounded-[1.1rem] border border-[var(--border)] bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => setAuthed(true)}
              disabled={!password.trim()}
              className="min-h-12 rounded-full bg-[var(--night)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enter
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8 sm:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[rgba(255,252,246,0.9)] p-6 shadow-[0_24px_70px_rgba(58,39,23,0.11)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--accent-strong)]">Production cockpit</p>
          <h1 className="mt-3 font-display text-4xl text-[var(--night)]">Generate, monitor, publish.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            This panel now drives the real pipeline. Generate takes an episode all the way to the mixing stage, and publish pushes mixed files into the RSS feed.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_auto]">
            <input
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Optional topic override. Leave blank to pull the top-voted queue item."
              className="min-h-12 rounded-[1.1rem] border border-[var(--border)] bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => {
                void generateEpisode();
              }}
              disabled={isGenerating}
              className="min-h-12 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
            >
              {isGenerating ? "Generating..." : "Generate Episode"}
            </button>
            <button
              type="button"
              onClick={() => {
                void publishEpisodes();
              }}
              disabled={isPublishing || mixedEpisodes.length === 0}
              className="min-h-12 rounded-full border border-[var(--border)] bg-[var(--night)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
            >
              {isPublishing ? "Publishing..." : "Publish All Pending"}
            </button>
          </div>

          {generateMessage ? <p className="mt-4 text-sm text-[var(--success)]">{generateMessage}</p> : null}
          {adminError ? <p className="mt-4 text-sm text-[var(--danger)]">{adminError}</p> : null}
        </div>

        <div className="rounded-[2rem] border border-[var(--border)] bg-[rgba(17,23,32,0.95)] p-6 text-white shadow-[0_24px_70px_rgba(16,18,25,0.22)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[rgba(255,215,176,0.72)]">Credit monitor</p>
              <h2 className="mt-2 font-display text-3xl">{status.credits.percentUsed}% used</h2>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-[rgba(255,244,232,0.82)]">
              {status.credits.used.toLocaleString()} / {status.credits.budget.toLocaleString()} chars
            </span>
          </div>

          <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/12">
            <div className={`h-full rounded-full ${toneForPercent(status.credits.percentUsed)}`} style={{ width: `${Math.min(status.credits.percentUsed, 100)}%` }} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.2rem] bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[rgba(255,215,176,0.72)]">Pending publish</p>
              <p className="mt-2 font-display text-3xl">{status.pendingPublishCount}</p>
            </div>
            <div className="rounded-[1.2rem] bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[rgba(255,215,176,0.72)]">SFX cache</p>
              <p className="mt-2 font-display text-3xl">{status.cache.sfx}</p>
            </div>
            <div className="rounded-[1.2rem] bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[rgba(255,215,176,0.72)]">Cache weight</p>
              <p className="mt-2 font-display text-3xl">{formatBytes(status.cache.totalSizeBytes)}</p>
            </div>
          </div>
        </div>
      </section>

      {status.generating ? (
        <section className="rounded-[1.8rem] border border-[rgba(255,209,149,0.3)] bg-[rgba(255,240,212,0.82)] px-5 py-4 text-[var(--night)] shadow-[0_20px_40px_rgba(177,115,52,0.1)]">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">Pipeline active</p>
          <p className="mt-2 text-base">
            Episode {String(status.generating.episodeNumber).padStart(3, "0")} is currently {status.generating.status} for “{status.generating.topicTitle}”. Started {formatRelativeTime(status.generating.createdAt)}.
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[rgba(255,252,246,0.9)] p-6 shadow-[0_22px_60px_rgba(58,39,23,0.09)]">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--accent-strong)]">Episode ledger</p>
              <h2 className="mt-2 font-display text-3xl text-[var(--night)]">Recent pipeline output</h2>
            </div>
            <span className="rounded-full bg-[rgba(17,23,32,0.92)] px-3 py-1 text-xs font-semibold text-white">
              {status.publishedCount} published
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {status.recentEpisodes.map((episode) => (
              <div key={episode.id} className="grid gap-4 rounded-[1.3rem] border border-[var(--border)] bg-white/80 px-4 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--accent-strong)]">Episode {String(episode.episodeNumber).padStart(3, "0")}</p>
                  <p className="mt-1 text-base font-semibold text-[var(--night)]">{episode.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{episode.topicTitle}</p>
                </div>
                <div className="text-sm text-[var(--muted)] md:text-right">
                  <p>{episode.publishedAt ? formatEpisodeDate(episode.publishedAt) : formatRelativeTime(episode.createdAt)}</p>
                  <p>{formatDurationLabel(episode.durationSeconds)} • {episode.charactersUsed.toLocaleString()} chars</p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]">
                    {episode.status}
                  </span>
                  {episode.status === "mixing" ? (
                    <button
                      type="button"
                      onClick={() => {
                        void publishEpisodes(episode.id);
                      }}
                      disabled={isPublishing}
                      className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-50"
                    >
                      Publish
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-[var(--border)] bg-[rgba(255,252,246,0.9)] p-6 shadow-[0_22px_60px_rgba(58,39,23,0.09)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--accent-strong)]">Queue watch</p>
            <h2 className="mt-2 font-display text-3xl text-[var(--night)]">Pending topics</h2>
            <div className="mt-4 space-y-3">
              {topics.length === 0 ? (
                <p className="text-sm italic text-[var(--muted)]">The public queue is empty right now.</p>
              ) : (
                topics.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-[var(--border)] bg-white/80 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--night)]">{entry.title}</p>
                      {entry.description ? <p className="mt-1 text-sm text-[var(--muted)]">{entry.description}</p> : null}
                    </div>
                    <span className="rounded-full bg-[rgba(17,23,32,0.92)] px-3 py-1 text-xs font-semibold text-white">{entry.votes} votes</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-[var(--border)] bg-[rgba(255,252,246,0.9)] p-6 shadow-[0_22px_60px_rgba(58,39,23,0.09)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--accent-strong)]">Budget drilldown</p>
            <h2 className="mt-2 font-display text-3xl text-[var(--night)]">Recent spend</h2>
            <div className="mt-4 space-y-3">
              {status.credits.episodeBreakdown.slice(0, 5).map((entry) => (
                <div key={entry.episodeId} className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-[var(--border)] bg-white/80 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-[var(--night)]">{entry.topic}</p>
                    <p className="text-[var(--muted)]">{entry.status}</p>
                  </div>
                  <span className="text-[var(--foreground)]">{entry.characters.toLocaleString()} chars</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

