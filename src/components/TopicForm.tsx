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
          ? "Already in the queue \u2014 picked up another vote!"
          : `Queued: ${payload.title}`,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-[1.2fr_0.8fr]"}`}>
        <label className="space-y-2 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">Your topic</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Should chairs get PTO?"
            maxLength={100}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
        </label>

        {!compact ? (
          <label className="space-y-2 text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">Optional angle</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Give Marina a reason to panic."
              maxLength={300}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting || title.trim().length < 3}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--accent-hover)] hover:shadow-[0_0_20px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M12 5v14" />
              </svg>
              Pitch Topic
            </>
          )}
        </button>
        {status.message ? (
          <p
            className={`text-sm font-medium ${
              status.tone === "error"
                ? "text-[var(--danger)]"
                : status.tone === "success"
                  ? "text-[var(--success)]"
                  : "text-[var(--text-muted)]"
            }`}
          >
            {status.message}
          </p>
        ) : (
          <p className="text-xs text-[var(--text-faint)]">The weirdest good idea usually wins.</p>
        )}
      </div>
    </form>
  );
}
