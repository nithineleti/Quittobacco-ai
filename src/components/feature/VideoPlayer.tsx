"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { useStore } from "@/lib/store";

/**
 * Simulated lesson player. There's no real video file (offline + bundle budget),
 * but the watch mechanic is honest: progress only advances while playing, and
 * "completed" requires reaching the end — persisted to the store and surfaced to
 * the clinician dashboard (§3.3).
 */
export function VideoPlayer({ id, durationSec }: { id: string; durationSec: number }) {
  const { t } = useTranslation();
  const setVideoProgress = useStore((s) => s.setVideoProgress);
  const stored = useStore((s) => s.videos[id]);
  const [playing, setPlaying] = useState(false);
  const [pct, setPct] = useState(stored?.percent ?? 0);
  const pctRef = useRef(stored?.percent ?? 0);

  useEffect(() => {
    if (!playing) return;
    const step = 100 / (durationSec * 4); // ~4 ticks/sec
    const timer = setInterval(() => {
      pctRef.current = Math.min(100, pctRef.current + step);
      setPct(pctRef.current);
      setVideoProgress(id, pctRef.current);
      if (pctRef.current >= 100) {
        clearInterval(timer);
        setPlaying(false);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [playing, durationSec, id, setVideoProgress]);

  const done = stored?.status === "completed" || pct >= 100;

  const toggle = () => {
    if (done && !playing) {
      pctRef.current = 0;
      setPct(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  return (
    <div className="overflow-hidden rounded-card border border-border">
      <div className="relative grid aspect-video place-items-center bg-primary-soft">
        <button
          type="button"
          onClick={toggle}
          aria-label={done && !playing ? t("learn.replay") : playing ? t("learn.pause") : t("learn.play")}
          className="grid size-16 place-items-center rounded-pill bg-primary text-primary-fg shadow-float hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Icon name={done && !playing ? "RotateCcw" : playing ? "Pause" : "Play"} className="size-8" />
        </button>
        <span className="absolute bottom-2 left-3 text-xs font-medium text-primary">
          {t("learn.demoPlayer")}
        </span>
      </div>
      <div className="p-3">
        <div
          className="h-2 w-full overflow-hidden rounded-pill bg-surface-2"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-pill bg-primary transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span className="tabular-nums">{Math.round(pct)}%</span>
          {done && <span className="font-semibold text-success">{t("learn.completedTag")}</span>}
        </div>
      </div>
    </div>
  );
}
