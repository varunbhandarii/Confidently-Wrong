"use client";

import { startTransition, useEffect, useState } from "react";

import type { PublicTopicSummary } from "@/lib/view-models";

interface TopicVotingProps {
  initialTopics: PublicTopicSummary[];
}

async function fetchTopicsFromApi(): Promise<PublicTopicSummary[]> {
  const response = await fetch("/api/topics", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to refresh topics.");
  }

  return (await response.json()) as PublicTopicSummary[];
}

function sortTopics(topics: PublicTopicSummary[]): PublicTopicSummary[] {
  return [...topics].sort((left, right) => {
    if (right.votes !== left.votes) {
      return right.votes - left.votes;
    }

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

export default function TopicVoting({ initialTopics }: TopicVotingProps) {
  const [topics, setTopics] = useState<PublicTopicSummary[]>(sortTopics(initialTopics));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const maxVotes = Math.max(1, ...topics.map((t) => t.votes));

  useEffect(() => {
    const refreshTopics = async () => {
      try {
        const payload = await fetchTopicsFromApi();
        setTopics(sortTopics(payload));
      } catch {
        // Keep current state if the refresh fails.
      }
    };

    const handleTopicCreated = (event: Event) => {
      const customEvent = event as CustomEvent<PublicTopicSummary & { deduped?: boolean }>;
      const topic = customEvent.detail;

      setTopics((currentTopics) => {
        const existing = currentTopics.find((entry) => entry.id === topic.id);
        if (existing) {
          return sortTopics(
            currentTopics.map((entry) => (entry.id === topic.id ? { ...entry, votes: topic.votes } : entry)),
          );
        }

        return sortTopics([topic, ...currentTopics]);
      });
    };

    window.addEventListener("cw-topic-created", handleTopicCreated as EventListener);
    void refreshTopics();
    const intervalId = window.setInterval(() => {
      void refreshTopics();
    }, 20000);

    return () => {
      window.removeEventListener("cw-topic-created", handleTopicCreated as EventListener);
      window.clearInterval(intervalId);
    };
  }, []);

  async function vote(topicId: string) {
    setBusyId(topicId);
    setError("");

    setTopics((currentTopics) =>
      sortTopics(
        currentTopics.map((topic) =>
          topic.id === topicId
            ? {
                ...topic,
                votes: topic.votes + 1,
              }
            : topic,
        ),
      ),
    );

    try {
      const response = await fetch("/api/topics/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topicId }),
      });

      const payload = (await response.json()) as { id?: string; votes?: number; error?: string };
      if (!response.ok || !payload.id || payload.votes === undefined) {
        throw new Error(payload.error || "Vote failed.");
      }

      startTransition(() => {
        setTopics((currentTopics) =>
          sortTopics(
            currentTopics.map((topic) =>
              topic.id === payload.id
                ? {
                    ...topic,
                    votes: payload.votes ?? topic.votes,
                  }
                : topic,
            ),
          ),
        );
      });
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "Vote failed.");
      try {
        const payload = await fetchTopicsFromApi();
        setTopics(sortTopics(payload));
      } catch {
        // Keep optimistic UI if refresh fails too.
      }
    } finally {
      setBusyId(null);
    }
  }

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
        <div className="mb-3 rounded-full bg-[var(--accent-soft)] p-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="text-sm text-[var(--text-muted)]">No topics yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="stagger-list space-y-2.5">
      {topics.map((topic, index) => {
        const votePercent = (topic.votes / maxVotes) * 100;
        const isTop = index === 0 && topics.length > 1;

        return (
          <div
            key={topic.id}
            className={`group relative overflow-hidden rounded-xl border bg-[var(--surface)] p-3.5 transition-all hover:bg-[var(--surface-raised)] ${
              isTop ? "border-[var(--accent-glow)]" : "border-[var(--border)]"
            }`}
          >
            <div
              className="vote-bar-fill absolute inset-y-0 left-0 bg-[var(--accent-soft)] transition-all duration-500"
              style={{ width: `${votePercent}%` }}
            />

            <div className="relative flex items-center gap-3">
              <span className={`font-mono text-sm font-bold ${isTop ? "text-[var(--accent)]" : "text-[var(--text-faint)]"}`}>
                #{index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text)]">{topic.title}</p>
                {topic.description ? (
                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{topic.description}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => { void vote(topic.id); }}
                disabled={busyId === topic.id}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-bold text-[var(--text)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95 disabled:opacity-40"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
                </svg>
                <span className="font-mono">{topic.votes}</span>
              </button>
            </div>
          </div>
        );
      })}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
