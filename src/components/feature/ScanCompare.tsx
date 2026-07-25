"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { getImageURL } from "@/lib/idb";
import type { ScanRecord } from "@/lib/store";

// Recharts is heavy — load it only when the trend is actually shown (§4, §7).
const TrendChart = dynamic(() => import("@/components/feature/TrendChart"), {
  ssr: false,
  loading: () => <div className="h-48 w-full animate-pulse rounded-card bg-surface-2" />,
});

export function ScanCompare({ scans }: { scans: ScanRecord[] }) {
  const { t } = useTranslation();
  const baseline = scans[0];
  const latest = scans[scans.length - 1];
  const [split, setSplit] = useState(50);
  const [urls, setUrls] = useState<{ b: string | null; l: string | null }>({ b: null, l: null });

  useEffect(() => {
    let alive = true;
    let created: string[] = [];
    (async () => {
      const b = baseline?.imageKey ? await getImageURL(baseline.imageKey) : null;
      const l = latest?.imageKey ? await getImageURL(latest.imageKey) : null;
      if (!alive) {
        [b, l].forEach((u) => u && URL.revokeObjectURL(u));
        return;
      }
      created = [b, l].filter((u): u is string => Boolean(u));
      setUrls({ b, l });
    })();
    return () => {
      alive = false;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [baseline, latest]);

  const trend = scans.map((s) => ({ day: s.dayIndex, score: s.score }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-fg">{t("assess.beforeAfter")}</h2>
        <p className="text-sm text-muted">{t("assess.beforeAfterHint")}</p>
      </div>

      {urls.b && urls.l ? (
        <div className="relative aspect-video select-none overflow-hidden rounded-card border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls.l} alt={t("assess.latest")} className="absolute inset-0 h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls.b}
            alt={t("assess.day1")}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
          />
          <span className="absolute left-2 top-2 rounded-pill bg-fg/70 px-2 py-0.5 text-xs font-semibold text-surface">
            {t("assess.day1")}
          </span>
          <span className="absolute right-2 top-2 rounded-pill bg-fg/70 px-2 py-0.5 text-xs font-semibold text-surface">
            {t("assess.latest")}
          </span>
          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-card" style={{ left: `${split}%` }} aria-hidden />
          <div
            className="pointer-events-none absolute top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-pill bg-card text-fg shadow-float"
            style={{ left: `${split}%` }}
            aria-hidden
          >
            <Icon name="ChevronLeft" className="size-4" />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            aria-label={t("assess.beforeAfterHint")}
            className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-card border border-dashed border-border p-4 text-center">
          <p className="max-w-xs text-sm text-muted">{t("assess.needPhotos")}</p>
        </div>
      )}

      {scans.length >= 2 && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-fg">{t("assess.trend")}</h2>
          <TrendChart data={trend} />
        </div>
      )}
    </div>
  );
}
