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
      return "Voices are rendering in the booth right now.";
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
    <div className="border-b border-[rgba(255,214,164,0.35)] bg-[linear-gradient(90deg,rgba(255,239,203,0.95),rgba(255,222,166,0.92),rgba(255,239,203,0.95))] text-[var(--night)] shadow-[0_10px_30px_rgba(164,102,49,0.16)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3 sm:px-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(17,23,32,0.92)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)] animate-[signalPulse_1.8s_ease-in-out_infinite]" />
          Now Generating
        </span>
        <p className="text-sm font-medium">
          Episode {String(snapshot.generating.episodeNumber).padStart(3, "0")}: “{snapshot.generating.topicTitle}”
        </p>
        <p className="text-sm text-[rgba(24,16,10,0.7)]">{statusCopy(snapshot.generating.status)}</p>
      </div>
    </div>
  );
}

