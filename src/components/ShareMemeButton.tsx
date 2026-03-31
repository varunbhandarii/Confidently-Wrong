"use client";

import { useState } from "react";

interface ShareMemeButtonProps {
  memeUrl: string;
  title: string;
}

function getAbsoluteMemeUrl(memeUrl: string): string {
  if (typeof window === "undefined") {
    return memeUrl;
  }

  return new URL(memeUrl, window.location.origin).toString();
}

export default function ShareMemeButton({ memeUrl, title }: ShareMemeButtonProps) {
  const [label, setLabel] = useState("Share Meme");

  async function handleShare() {
    const shareUrl = getAbsoluteMemeUrl(memeUrl);
    const shareData = {
      title: `${title} meme`,
      text: `Confidently Wrong generated this meme for "${title}"`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setLabel("Shared");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setLabel("Copied");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setLabel("Try Again");
      window.setTimeout(() => {
        setLabel("Share Meme");
      }, 2000);
      return;
    }

    window.setTimeout(() => {
      setLabel("Share Meme");
    }, 2000);
  }

  return (
    <button
      type="button"
      onClick={() => { void handleShare(); }}
      className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {label}
    </button>
  );
}
