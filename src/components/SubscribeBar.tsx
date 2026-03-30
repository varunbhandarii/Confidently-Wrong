"use client";

import { useState } from "react";

interface SubscribeBarProps {
  feedUrl: string;
}

export default function SubscribeBar({ feedUrl }: SubscribeBarProps) {
  const [copied, setCopied] = useState(false);

  async function copyFeedUrl() {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href="/feed.xml"
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
      >
        Open RSS Feed
      </a>
      <button
        type="button"
        onClick={() => {
          void copyFeedUrl();
        }}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border)] bg-white/84 px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]"
      >
        {copied ? "Feed URL Copied" : "Copy Feed URL"}
      </button>
      <a
        href="/admin"
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(17,23,32,0.18)] bg-[rgba(17,23,32,0.92)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
      >
        Open Admin Desk
      </a>
    </div>
  );
}

