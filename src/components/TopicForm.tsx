"use client";

import { startTransition, useState } from "react";

import type { PublicTopicSummary } from "@/lib/view-models";

interface TopicFormProps {
  compact?: boolean;
}

export default function TopicForm({ compact = false }: TopicFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<{ tone: "idle" | "success" | "error"; message: string }>({
    tone: "idle",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ tone: "idle", message: "" });

    try {
      const response = await fetch("/api/topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description }),
      });

      const payload = (await response.json()) as (PublicTopicSummary & { deduped?: boolean; error?: string });

      if (!response.ok) {
        throw new Error(payload.error || "Topic submission failed.");
      }

      if (!payload.deduped) {
        setTitle("");
        setDescription("");
      }

      startTransition(() => {
        window.dispatchEvent(new CustomEvent("cw-topic-created", { detail: payload }));
      });

      setStatus({
        tone: "success",
        message: payload.deduped
          ? "That topic was already in the queue, so it just picked up another vote."
          : `Queued up: ${payload.title}`,
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Topic submission failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-[1.2fr_0.8fr]"}`}>
        <label className="space-y-2 text-sm text-[var(--muted)]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">Your topic</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Should chairs get PTO?"
            maxLength={100}
            className="w-full rounded-[1.15rem] border border-[var(--border)] bg-white/90 px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
          />
        </label>

        {!compact ? (
          <label className="space-y-2 text-sm text-[var(--muted)]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">Optional angle</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Give Marina a reason to panic."
              maxLength={300}
              className="w-full rounded-[1.15rem] border border-[var(--border)] bg-white/90 px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
            />
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending to the booth..." : "Pitch this topic"}
        </button>
        <p
          className={`text-sm ${
            status.tone === "error"
              ? "text-[var(--danger)]"
              : status.tone === "success"
                ? "text-[var(--success)]"
                : "text-[var(--muted)]"
          }`}
        >
          {status.message || "The weirdest good idea usually wins."}
        </p>
      </div>
    </form>
  );
}

