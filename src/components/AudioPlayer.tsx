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
      await audio.play();
      setIsPlaying(true);
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

  return (
    <div className="rounded-[1.4rem] border border-[color:rgba(87,61,42,0.14)] bg-[rgba(255,251,245,0.8)] p-4 shadow-[0_18px_40px_rgba(53,34,20,0.06)]">
      <audio ref={audioRef} preload="none">
        <source src={src} type="audio/mpeg" />
      </audio>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void togglePlayback();
          }}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--night)] text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-black"
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
            <span>Playback desk</span>
            <span>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => handleSeek(Number(event.target.value))}
            className="h-3 w-full cursor-pointer accent-[var(--accent)]"
            aria-label={`Seek ${title}`}
          />
        </div>

        <button
          type="button"
          onClick={cycleSpeed}
          className="rounded-full border border-[var(--border)] bg-white/80 px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]"
        >
          {SPEED_STEPS[speedIndex]}x
        </button>
      </div>
    </div>
  );
}

