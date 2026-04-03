"use client";

import { useEffect, useId, useRef, useState } from "react";

interface AudioPlayerProps {
  src: string;
  title: string;
}

const SPEED_STEPS = [1, 1.25, 1.5, 2];

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function AudioPlayer({ src, title }: AudioPlayerProps) {
  const audioId = useId();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const syncProgress = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleExternalPlay = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail !== audioId) {
        audio.pause();
        setIsPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", syncProgress);
    audio.addEventListener("loadedmetadata", syncProgress);
    audio.addEventListener("ended", handleEnded);
    window.addEventListener("cw-audio-play", handleExternalPlay as EventListener);

    return () => {
      audio.removeEventListener("timeupdate", syncProgress);
      audio.removeEventListener("loadedmetadata", syncProgress);
      audio.removeEventListener("ended", handleEnded);
      window.removeEventListener("cw-audio-play", handleExternalPlay as EventListener);
    };
  }, [audioId]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      window.dispatchEvent(new CustomEvent("cw-audio-play", { detail: audioId }));
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        // Browser blocked autoplay or playback failed — stay paused.
        setIsPlaying(false);
      }
      return;
    }

    audio.pause();
    setIsPlaying(false);
  }

  function handleSeek(value: number) {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = value;
    setCurrentTime(value);
  }

  function cycleSpeed() {
    const nextIndex = (speedIndex + 1) % SPEED_STEPS.length;
    setSpeedIndex(nextIndex);

    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = SPEED_STEPS[nextIndex];
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <audio ref={audioRef} preload="none">
        <source src={src} type="audio/mpeg" />
      </audio>

      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <button
          type="button"
          onClick={() => { void togglePlayback(); }}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-all hover:bg-[var(--accent-hover)] hover:shadow-[0_0_20px_var(--accent-glow)] hover:scale-105 active:scale-95"
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Progress area */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            {/* Equalizer + label */}
            <div className="flex items-center gap-2">
              <div className={`eq-bars ${isPlaying ? "playing" : ""}`}>
                <span /><span /><span /><span />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
                {isPlaying ? "Playing" : "Ready"}
              </span>
            </div>
            <span className="font-mono text-xs text-[var(--text-muted)]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Custom seek bar */}
          <div className="relative h-5 flex items-center">
            {/* Track background */}
            <div className="absolute inset-x-0 h-1 rounded-full bg-[rgba(255,255,255,0.08)]">
              {/* Filled portion */}
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => handleSeek(Number(event.target.value))}
              className="audio-seek absolute inset-x-0 h-5 w-full"
              aria-label={`Seek ${title}`}
            />
          </div>
        </div>

        {/* Speed control */}
        <button
          type="button"
          onClick={cycleSpeed}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 font-mono text-xs font-bold text-[var(--text-muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {SPEED_STEPS[speedIndex]}x
        </button>
      </div>
    </div>
  );
}
