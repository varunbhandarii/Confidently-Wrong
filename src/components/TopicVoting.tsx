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
      <p className="rounded-[1.4rem] border border-dashed border-[var(--border)] px-4 py-5 text-sm italic text-[var(--muted)]">
        No topics suggested yet. Be the first person to derail the next episode.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {topics.map((topic, index) => (
        <div
          key={topic.id}
          className="grid gap-3 rounded-[1.35rem] border border-[var(--border)] bg-white/80 px-4 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"
        >
          <div className="font-display text-3xl text-[var(--accent-strong)]">{String(index + 1).padStart(2, "0")}</div>
          <div>
            <p className="text-sm font-semibold text-[var(--night)]">{topic.title}</p>
            {topic.description ? <p className="mt-1 text-sm text-[var(--muted)]">{topic.description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => {
              void vote(topic.id);
            }}
            disabled={busyId === topic.id}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(17,23,32,0.94)] px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--accent)] disabled:opacity-60"
          >
            <span>{busyId === topic.id ? "Voting..." : "Vote"}</span>
            <span className="rounded-full bg-white/14 px-2 py-0.5 text-xs">{topic.votes}</span>
          </button>
        </div>
      ))}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

