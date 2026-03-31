"use client";

import { useEffect, useState } from "react";

import type { PipelineStatusSnapshot } from "@/lib/view-models";

interface StatusBannerProps {
  initialStatus: PipelineStatusSnapshot;
}

async function fetchStatusSnapshot(): Promise<PipelineStatusSnapshot> {
  const response = await fetch("/api/status", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to refresh status.");
  }

  return (await response.json()) as PipelineStatusSnapshot;
}

function statusCopy(status: string): string {
  switch (status) {
    case "scripting":
      return "Chad and Marina are drafting their next terrible argument.";
    case "synthesizing":
      return "Voices are rendering in the booth.";
    case "mixing":
      return "Final jingles and bad decisions are being stitched together.";
    default:
      return "A fresh episode is on the way.";
  }
}

export default function StatusBanner({ initialStatus }: StatusBannerProps) {
  const [snapshot, setSnapshot] = useState(initialStatus);

  useEffect(() => {
    const refreshStatus = async () => {
      try {
        const payload = await fetchStatusSnapshot();
        setSnapshot(payload);
      } catch {
        // Leave the banner state as-is when polling fails.
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshStatus();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  if (!snapshot.generating) {
    return null;
  }

  return (
    <div className="border-b border-[var(--accent-glow)] bg-gradient-to-r from-[rgba(249,115,22,0.08)] via-[rgba(249,115,22,0.12)] to-[rgba(249,115,22,0.08)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-3 sm:px-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--live)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
          <span className="h-2 w-2 rounded-full bg-white animate-[signalPulse_1.2s_ease-in-out_infinite]" />
          Live
        </span>
        <p className="text-sm font-medium text-[var(--text)]">
          EP {String(snapshot.generating.episodeNumber).padStart(3, "0")}: &ldquo;{snapshot.generating.topicTitle}&rdquo;
        </p>
        <p className="text-sm text-[var(--text-muted)]">{statusCopy(snapshot.generating.status)}</p>
      </div>
    </div>
  );
}
