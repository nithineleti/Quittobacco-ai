"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { CheckIn } from "@/components/feature/CheckIn";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { GrowingPlant } from "@/components/feature/GrowingPlant";
import { BADGE_META } from "@/data/badges";
import { loc } from "@/data/types";
import { formatINR } from "@/lib/format";
import { tangibleSavings } from "@/lib/health";
import {
  badgeInfo,
  checkedInToday,
  moneySavedTotal,
  nextRewardSel,
  recovery,
  streakDays,
  totalFreeDaysSel,
} from "@/lib/selectors";
import { useHydrated, useStore } from "@/lib/store";

export function DashboardScreen() {
  const hydrated = useHydrated();
  const router = useRouter();
  const sp = useSearchParams();
  const { t } = useTranslation();
  const s = useStore();
  const [checkInOpen, setCheckInOpen] = useState(sp.get("checkin") === "1");

  useEffect(() => {
    if (hydrated && !s.quitDate) router.replace("/onboarding");
  }, [hydrated, s.quitDate, router]);

  if (!hydrated || !s.quitDate) return <DashboardSkeleton />;

  const now = new Date();
  const lang = s.language;
  const streak = streakDays(s, now);
  const total = totalFreeDaysSel(s, now);
  const saved = moneySavedTotal(s, now);
  const rec = recovery(s, now);
  const badge = badgeInfo(s, now);
  const next = nextRewardSel(s, now);
  const didToday = checkedInToday(s, now);
  const meta = BADGE_META[badge.tier];

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{t("dashboard.greeting")},</p>
          <h1 className="text-2xl font-semibold text-fg">
            {s.displayName ?? t("dashboard.friend")}
          </h1>
        </div>
        <Link
          href="/progress"
          className="rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("dashboard.yourBadge")}
        >
          <Pill tone="gold">
            <Icon name={meta.icon} className="size-4" />
            {loc(meta.name, lang)}
          </Pill>
        </Link>
      </header>

      {/* Hero — days free + growing plant */}
      <Card float className="flex items-center justify-between gap-4 bg-primary-soft">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold tabular-nums text-primary">{streak}</span>
            <span className="text-lg text-fg">{t("dashboard.dayStreak")}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{t("dashboard.totalFree", { count: total })}</p>
          <p className="mt-2 inline-block rounded-pill bg-card px-2.5 py-1 text-xs font-semibold text-primary">
            {t("dashboard.recovery")} · {rec}%
          </p>
        </div>
        <GrowingPlant
          days={total}
          className="h-28 w-24 shrink-0"
          label={t("dashboard.recovery")}
        />
      </Card>

      {/* Guest save nudge — only after they've felt value (§7) */}
      {s.isGuest && streak >= 1 && (
        <Link
          href="/profile"
          className="rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="flex items-center gap-3 bg-gold-soft">
            <Icon name="Star" className="size-5 shrink-0 text-gold" />
            <p className="flex-1 text-sm font-semibold text-fg">{t("dashboard.saveNudge")}</p>
            <Icon name="ChevronRight" className="size-5 shrink-0 text-muted" />
          </Card>
        </Link>
      )}

      {/* Today's check-in — the primary action */}
      {didToday ? (
        <Card className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-pill bg-success-soft text-success">
            <Icon name="CheckCircle2" className="size-6" />
          </span>
          <p className="text-base font-semibold text-fg">{t("dashboard.checkedIn")}</p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <div>
            <p className="text-base font-semibold text-fg">{t("dashboard.checkInTitle")}</p>
            <p className="text-sm text-muted">{t("dashboard.checkInSub")}</p>
          </div>
          <Button size="lg" full onClick={() => setCheckInOpen(true)}>
            <Icon name="PencilLine" className="size-5" />
            {t("dashboard.checkInCta")}
          </Button>
        </Card>
      )}

      {/* Next reward */}
      {next && (
        <Link
          href="/rewards"
          className="rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-pill bg-gold-soft text-gold">
              <Icon name={next.rung.icon} className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted">{t("dashboard.nextReward")}</p>
              <p className="truncate text-base font-semibold text-fg">
                {t(`rewards.ladder.${next.rung.id}.title`)}
              </p>
            </div>
            {next.status.state === "locked" ? (
              <Pill tone="neutral">
                {t("dashboard.moreDays", { count: next.status.daysRemaining })}
              </Pill>
            ) : next.status.state === "needs-evidence" ? (
              <Pill tone="warning">{t("rewards.needEvidence")}</Pill>
            ) : (
              <Pill tone="gold">{t("dashboard.ready")}</Pill>
            )}
          </Card>
        </Link>
      )}

      {/* Money saved */}
      <Card className="flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-pill bg-success-soft text-success">
          <Icon name="Wallet" className="size-6" />
        </span>
        <div>
          <div className="text-2xl font-semibold tabular-nums text-fg">{formatINR(saved)}</div>
          <div className="text-sm text-muted">
            {t("dashboard.saved")} · {t("dashboard.thatsLike", { thing: t(`dashboard.tangible.${tangibleSavings(saved)}`) })}
          </div>
        </div>
      </Card>

      {/* Craving rescue prompt */}
      <Link
        href="/sos"
        className="rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-pill bg-primary text-primary-fg">
            <Icon name="LifeBuoy" className="size-6" />
          </span>
          <div className="flex-1">
            <p className="text-base font-semibold text-fg">{t("dashboard.cravingNow")}</p>
            <p className="text-sm text-muted">{t("dashboard.openSos")}</p>
          </div>
          <Icon name="ChevronRight" className="size-5 text-muted" />
        </Card>
      </Link>

      {/* Secondary destinations (bottom nav is capped at 5) */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { href: "/plan", icon: "ClipboardList", label: t("dashboard.linkPlan") },
          { href: "/assess", icon: "ScanLine", label: t("dashboard.linkCheck") },
          { href: "/help", icon: "LifeBuoy", label: t("dashboard.linkHelp") },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex flex-col items-center gap-1 rounded-card border border-border bg-card p-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon name={l.icon} className="size-6 text-primary" />
            <span className="text-sm font-semibold text-fg">{l.label}</span>
          </Link>
        ))}
      </div>

      <CheckIn open={checkInOpen} onClose={() => setCheckInOpen(false)} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
