"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { GrowingPlant } from "@/components/feature/GrowingPlant";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { Stat } from "@/components/ui/Stat";
import { BADGE_META } from "@/data/badges";
import { RECOVERY_MILESTONES } from "@/data/recovery";
import { TRIGGERS, triggerById } from "@/data/triggers";
import { loc } from "@/data/types";
import { cn } from "@/lib/cn";
import { daysBetween, formatINR } from "@/lib/format";
import {
  computeTriggerInsight,
  nextMilestone,
  reachedMilestones,
  savingsGoalPercent,
} from "@/lib/health";
import { BADGE_TIERS, tierIndex } from "@/lib/scoring";
import { shareStreakCard } from "@/lib/shareCard";
import {
  badgeInfo,
  moneySavedTotal,
  streakDays,
  todayISO,
  totalFreeDaysSel,
} from "@/lib/selectors";
import { useHydrated, useStore } from "@/lib/store";

const TrendChart = dynamic(() => import("@/components/feature/TrendChart"), {
  ssr: false,
  loading: () => <div className="h-48 w-full animate-pulse rounded-card bg-surface-2" />,
});

type Tab = "overview" | "badges" | "timeline";

export function ProgressScreen() {
  const hydrated = useHydrated();
  const { t } = useTranslation();
  const s = useStore();
  const setSavingsGoal = useStore((st) => st.setSavingsGoal);
  const logSlip = useStore((st) => st.logSlip);
  const [tab, setTab] = useState<Tab>("overview");
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState(0);
  const [slipOpen, setSlipOpen] = useState(false);
  const [slipTrigger, setSlipTrigger] = useState<string | undefined>();

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const now = new Date();
  const lang = s.language;
  const streak = streakDays(s, now);
  const total = totalFreeDaysSel(s, now);
  const saved = moneySavedTotal(s, now);
  const goal = s.savingsGoal ?? 500;
  const goalPct = savingsGoalPercent(saved, goal);
  const badge = badgeInfo(s, now);
  const insight = computeTriggerInsight(s.checkIns);
  const milestones = reachedMilestones(total, RECOVERY_MILESTONES);
  const next = nextMilestone(total, RECOVERY_MILESTONES);

  const weekly = s.quitDate
    ? [...s.checkIns]
        .map((c) => ({ day: daysBetween(s.quitDate!, c.date), score: c.cravingLevel }))
        .sort((a, b) => a.day - b.day)
        .slice(-7)
    : [];

  const openGoal = () => {
    setGoalDraft(goal);
    setGoalOpen(true);
  };
  const saveGoal = () => {
    setSavingsGoal(Math.max(100, goalDraft));
    setGoalOpen(false);
  };
  const doSlip = () => {
    logSlip({ date: todayISO(now), triggerId: slipTrigger });
    setSlipTrigger(undefined);
    setSlipOpen(false);
  };
  const shareProgress = () =>
    shareStreakCard({
      days: total,
      name: s.displayName,
      daysLabel: t("share.cardDays"),
      savedLabel: t("share.cardSaved", { amount: formatINR(saved) }),
      shareText: t("share.streakText", { days: total }),
    });

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold text-fg">{t("progress.title")}</h1>
        <p className="text-sm text-muted">{t("progress.sub")}</p>
      </header>

      <div className="flex rounded-pill bg-surface-2 p-1" role="tablist">
        {(["overview", "badges", "timeline"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn(
              "min-h-11 flex-1 rounded-pill text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === k ? "bg-card text-fg shadow-float" : "text-muted",
            )}
          >
            {t(k === "overview" ? "progress.tabOverview" : k === "badges" ? "progress.tabBadges" : "progress.tabTimeline")}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <Card float className="flex items-center gap-4 bg-primary-soft">
            <GrowingPlant days={total} className="h-24 w-20 shrink-0" label={t("progress.title")} />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tabular-nums text-primary">{total}</span>
                <span className="text-base text-fg">{t("progress.totalDays")}</span>
              </div>
              <p className="mt-0.5 text-sm text-muted">{t("progress.sub")}</p>
            </div>
          </Card>

          <Button variant="secondary" full onClick={shareProgress}>
            <Icon name="Share2" className="size-5" />
            {t("share.progressBtn")}
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <Card className="items-start"><Stat value={streak} label={t("progress.currentRun")} /></Card>
            <Card><Stat value={total} label={t("progress.totalDays")} /></Card>
            <Card><Stat value={formatINR(saved)} label={t("progress.moneySaved")} /></Card>
          </div>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-fg">{t("progress.goalTitle")}</p>
              <button
                type="button"
                onClick={openGoal}
                className="min-h-9 rounded-pill px-3 text-sm font-semibold text-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("progress.editGoal")}
              </button>
            </div>
            <ProgressBar value={goalPct} tone="gold" label={t("progress.goalTitle")} />
            <p className="text-sm text-muted">
              {goalPct >= 100
                ? t("progress.goalReached")
                : `${formatINR(saved)} ${t("progress.goalOf", { goal: formatINR(goal) })}`}
            </p>
          </Card>

          <Card className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon name="Activity" className="size-5 text-primary" />
              <p className="text-base font-semibold text-fg">{t("progress.insightTitle")}</p>
            </div>
            {insight ? (
              <>
                <p className="text-base text-fg">{t("progress.insightBody", { window: insight.window })}</p>
                {insight.topTriggerId && triggerById(insight.topTriggerId) && (
                  <p className="text-sm text-muted">
                    {t("progress.insightTactic", {
                      tactic: loc(triggerById(insight.topTriggerId)!.coping, lang),
                    })}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">{t("progress.insightNeed")}</p>
            )}
          </Card>

          {weekly.length >= 2 && (
            <Card className="flex flex-col gap-2">
              <p className="text-base font-semibold text-fg">{t("progress.weeklyTitle")}</p>
              <TrendChart data={weekly} yMax={4} />
            </Card>
          )}

          <Card className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-pill bg-surface-2 text-muted">
              <Icon name="HeartPulse" className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-fg">{t("progress.slipTitle")}</p>
              <p className="text-sm text-muted">{t("progress.slipBody")}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSlipOpen(true)}>
              {t("progress.slipBtn")}
            </Button>
          </Card>
        </>
      )}

      {tab === "badges" && (
        <>
          <Card>
            <p className="mb-3 text-base font-semibold text-fg">{t("progress.badgesTitle")}</p>
            <div className="grid grid-cols-3 gap-3">
              {BADGE_TIERS.map((tier) => {
                const meta = BADGE_META[tier];
                const earned = tierIndex(tier) <= tierIndex(badge.tier);
                const current = tier === badge.tier;
                return (
                  <div key={tier} className="flex flex-col items-center gap-1 text-center">
                    <span
                      className={cn(
                        "grid size-16 place-items-center rounded-pill",
                        earned ? `${meta.fill} ${meta.fg}` : "bg-surface-2 text-muted",
                        current && `ring-2 ring-offset-2 ring-offset-card ${meta.ring}`,
                      )}
                    >
                      <Icon name={earned ? meta.icon : "Lock"} className="size-8" />
                    </span>
                    <span className="text-sm font-semibold text-fg">{loc(meta.name, lang)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
          {badge.next && (
            <Card className="flex flex-col gap-2">
              <p className="text-base font-semibold text-fg">
                {t("badge.nextUp", { tier: loc(BADGE_META[badge.next.tier].name, lang) })}
              </p>
              <ul className="flex flex-col gap-1.5">
                {badge.next.need.days > 0 && (
                  <li className="flex items-center gap-2 text-base text-fg">
                    <Icon name="ChevronRight" className="size-4 text-primary" />
                    {t("badge.needDays", { count: badge.next.need.days })}
                  </li>
                )}
                {badge.next.need.scans > 0 && (
                  <li className="flex items-center gap-2 text-base text-fg">
                    <Icon name="ChevronRight" className="size-4 text-primary" />
                    {t("badge.needScans", { count: badge.next.need.scans })}
                  </li>
                )}
                {badge.next.need.videos > 0 && (
                  <li className="flex items-center gap-2 text-base text-fg">
                    <Icon name="ChevronRight" className="size-4 text-primary" />
                    {t("badge.needVideos", { count: badge.next.need.videos })}
                  </li>
                )}
              </ul>
            </Card>
          )}
        </>
      )}

      {tab === "timeline" && (
        <>
          {next && (
            <Card className="flex items-center gap-4 bg-primary-soft">
              <span className="grid size-12 place-items-center rounded-pill bg-primary text-primary-fg">
                <Icon name="HeartPulse" className="size-6" />
              </span>
              <div>
                <p className="text-sm text-muted">{t("progress.nextMilestone", { benefit: loc(next.benefitL, lang) })}</p>
                <p className="text-base font-semibold text-fg">{t("progress.inDays", { count: next.daysRemaining })}</p>
              </div>
            </Card>
          )}
          <ol className="flex flex-col gap-2">
            {milestones.map((m) => (
              <li key={m.day}>
                <Card className={cn("flex items-start gap-3", m.reached && "bg-success-soft")}>
                  <span
                    className={cn(
                      "mt-0.5 grid size-8 shrink-0 place-items-center rounded-pill",
                      m.reached ? "bg-success text-success-fg" : "bg-surface-2 text-muted",
                    )}
                  >
                    <Icon name={m.reached ? "Check" : "Clock"} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg">{loc(m.whenLabel, lang)}</p>
                    <p className="text-sm text-muted">{loc(m.benefitL, lang)}</p>
                    <a
                      href={m.source}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      WHO
                      <Icon name="ArrowRight" className="size-3" />
                    </a>
                  </div>
                  {m.reached && <Pill tone="success">{t("progress.reachedTag")}</Pill>}
                </Card>
              </li>
            ))}
          </ol>
        </>
      )}

      {/* Savings goal sheet */}
      <Sheet open={goalOpen} onClose={() => setGoalOpen(false)} title={t("progress.goalTitle")}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              aria-label="Decrease"
              onClick={() => setGoalDraft((g) => Math.max(100, g - 500))}
              className="grid size-14 place-items-center rounded-pill border border-border text-fg hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon name="Minus" className="size-6" />
            </button>
            <div className="min-w-28 text-center text-3xl font-semibold tabular-nums text-fg">
              {formatINR(goalDraft)}
            </div>
            <button
              type="button"
              aria-label="Increase"
              onClick={() => setGoalDraft((g) => g + 500)}
              className="grid size-14 place-items-center rounded-pill border border-border text-fg hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon name="Plus" className="size-6" />
            </button>
          </div>
          <Button size="lg" full onClick={saveGoal}>
            {t("common.save")}
          </Button>
        </div>
      </Sheet>

      {/* Log a slip sheet */}
      <Sheet open={slipOpen} onClose={() => setSlipOpen(false)} title={t("progress.slipTitle")}>
        <div className="flex flex-col gap-4">
          <p className="text-base text-muted">{t("progress.slipBody")}</p>
          <div className="flex flex-wrap gap-2">
            {TRIGGERS.map((tr) => (
              <button
                key={tr.id}
                type="button"
                aria-pressed={slipTrigger === tr.id}
                onClick={() => setSlipTrigger(slipTrigger === tr.id ? undefined : tr.id)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  slipTrigger === tr.id
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card text-fg hover:bg-surface-2",
                )}
              >
                <Icon name={tr.icon} className="size-4" />
                {loc(tr.label, lang)}
              </button>
            ))}
          </div>
          <Button size="lg" full onClick={doSlip}>
            {t("progress.slipBtn")}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
