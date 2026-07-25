"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { CONTENT } from "@/data/content";
import { loc } from "@/data/types";
import { daysBetween, formatDate } from "@/lib/format";
import { riskTone, scoreToRisk } from "@/lib/risk";
import {
  distinctCheckInDays,
  streakDays,
  videosCompletedCount,
} from "@/lib/selectors";
import { useHydrated, useStore } from "@/lib/store";

export function AdminScreen() {
  const hydrated = useHydrated();
  const { t } = useTranslation();
  const s = useStore();

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <Skeleton className="h-8 w-48" />
      </main>
    );
  }

  const lang = s.language;
  const now = new Date();
  const videoItems = CONTENT.filter((c) => c.type === "video");
  const videosDone = videosCompletedCount(s);
  const checkins = distinctCheckInDays(s);
  const days = streakDays(s, now);
  const latest = s.scans.length > 0 ? s.scans[s.scans.length - 1] : null;

  const recentSlip = s.slips.some((sl) => daysBetween(sl.date, now) <= 7 && daysBetween(sl.date, now) >= 0);
  const flags: string[] = [];
  if (latest && latest.score >= 50) flags.push(t("admin.flagHighScore"));
  if (videosDone < 2) flags.push(t("admin.flagLowEngagement"));
  if (recentSlip) flags.push(t("admin.flagRecentSlip"));

  const metrics = [
    { label: t("admin.daysFree"), value: days },
    { label: t("admin.checkins"), value: checkins },
    { label: t("admin.videos"), value: `${videosDone}/${videoItems.length}` },
    { label: t("admin.lastScan"), value: latest ? latest.score : "—" },
  ];

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">{t("admin.title")}</h1>
          <p className="text-sm text-muted">{t("admin.sub")}</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center gap-1 rounded-pill border border-border px-4 text-sm font-semibold text-fg hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name="ChevronLeft" className="size-4" />
          {t("admin.backToApp")}
        </Link>
      </div>

      <p className="mb-4 text-xs text-muted">{t("admin.demoNote")}</p>

      <div className="mb-4 grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <Card key={m.label} padded>
            <div className="text-2xl font-semibold tabular-nums text-fg">{m.value}</div>
            <div className="text-sm text-muted">{m.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4">
        {/* Risk flags */}
        <Card className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-fg">{t("admin.flagTitle")}</h2>
          {flags.length === 0 ? (
            <p className="text-sm text-success">{t("admin.noFlags")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {flags.map((f) => (
                <li key={f} className="flex items-center gap-2 rounded-card bg-danger-soft px-3 py-2 text-sm text-danger">
                  <Icon name="AlertTriangle" className="size-4 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Scan history */}
        <Card className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-fg">{t("admin.scanTitle")}</h2>
          {s.scans.length === 0 ? (
            <p className="text-sm text-muted">—</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {[...s.scans].reverse().map((sc) => {
                const rt = riskTone(scoreToRisk(sc.score));
                return (
                  <li key={sc.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-fg">
                      {t("common.dayN", { n: sc.dayIndex })} · {formatDate(sc.date, lang === "hi" ? "hi-IN" : "en-IN")}
                    </span>
                    <span className={`rounded-pill px-2.5 py-0.5 font-semibold ${rt.softBg} ${rt.text}`}>
                      {sc.score}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Content engagement */}
      <Card className="mt-4 flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg">{t("admin.watchTitle")}</h2>
          <p className="text-sm text-muted">{t("admin.watchSub")}</p>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {videoItems.map((v) => {
            const st = s.videos[v.id]?.status ?? "not-started";
            return (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{loc(v.title, lang)}</span>
                {st === "completed" ? (
                  <Pill tone="success">{t("admin.completed")}</Pill>
                ) : st === "in-progress" ? (
                  <Pill tone="warning">
                    {t("admin.inProgress")} · {s.videos[v.id]?.percent ?? 0}%
                  </Pill>
                ) : (
                  <Pill tone="neutral">{t("admin.notStarted")}</Pill>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </main>
  );
}
