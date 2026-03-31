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
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href="/feed.xml"
        target="_blank"
        rel="noreferrer"
        className="group inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--accent-hover)] hover:shadow-[0_0_24px_var(--accent-glow)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" />
        </svg>
        RSS Feed
      </a>
      <button
        type="button"
        onClick={() => { void copyFeedUrl(); }}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition-all hover:border-[var(--accent)] hover:bg-[var(--surface-bright)]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
        {copied ? "Copied!" : "Copy URL"}
      </button>
    </div>
  );
}
