"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { CheckIn } from "@/components/feature/CheckIn";
import { RecoveryRing } from "@/components/feature/RecoveryRing";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconTile, type TileHue } from "@/components/ui/IconTile";
import { Pill } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
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

/** Each destination keeps one hue everywhere it appears — see IconTile. */
const SHORTCUTS: { href: string; icon: string; hue: TileHue; key: string }[] = [
  { href: "/reports", icon: "FileText", hue: "sky", key: "dashboard.linkReports" },
  { href: "/plan", icon: "ClipboardList", hue: "violet", key: "dashboard.linkPlan" },
  { href: "/help", icon: "PhoneCall", hue: "rose", key: "dashboard.linkHelp" },
];

export function DashboardScreen({ unreadReports = 0 }: { unreadReports?: number }) {
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
          <h1 className="text-2xl font-bold tracking-tight text-fg">
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

      {/* Hero — the streak, set like a headline on paper. */}
      <div className="flex items-center justify-between gap-4 rounded-card border border-border bg-card p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted">{t("dashboard.streakLabel")}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-7xl font-medium leading-none tabular-nums text-fg">{streak}</span>
            <span className="font-display text-2xl text-fg">{t("dashboard.days", { count: streak })}</span>
          </div>
          <p className="mt-2 text-sm text-muted">{t("dashboard.totalFree", { count: total })}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            <Icon name="HeartPulse" className="size-3.5" />
            {t("dashboard.recovery")} · {rec}%
          </p>
        </div>
        <RecoveryRing percent={rec} size={108} label={t("dashboard.recovery")} className="text-accent" />
      </div>

      {/* Something new from the clinic gets top billing, above the check-in. */}
      {unreadReports > 0 && (
        <Link
          href="/reports"
          className="rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="flex items-center gap-4 border-tile-sky-fg/30 bg-tile-sky">
            <IconTile icon="FileText" hue="sky" size="lg" className="bg-card" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-fg">{t("dashboard.reportsTitle")}</p>
              <p className="text-sm text-muted">{t("dashboard.reportsSub")}</p>
            </div>
            <Pill tone="primary" className="shrink-0">
              {t("dashboard.reportsNew", { count: unreadReports })}
            </Pill>
          </Card>
        </Link>
      )}

      {/* Guest save nudge — only after they've felt value (§7) */}
      {s.isGuest && streak >= 1 && (
        <Link
          href="/profile"
          className="rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="flex items-center gap-3 bg-gold-soft">
            <IconTile icon="Star" hue="amber" size="sm" />
            <p className="flex-1 text-sm font-semibold text-fg">{t("dashboard.saveNudge")}</p>
            <Icon name="ChevronRight" className="size-5 shrink-0 text-muted" />
          </Card>
        </Link>
      )}

      {/* Today's check-in — the primary action */}
      {didToday ? (
        <Card className="flex items-center gap-3">
          <IconTile icon="CheckCircle2" hue="emerald" />
          <p className="text-base font-semibold text-fg">{t("dashboard.checkedIn")}</p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <IconTile icon="PencilLine" hue="violet" />
            <div>
              <p className="text-base font-bold text-fg">{t("dashboard.checkInTitle")}</p>
              <p className="text-sm text-muted">{t("dashboard.checkInSub")}</p>
            </div>
          </div>
          <Button size="lg" full onClick={() => setCheckInOpen(true)}>
            {t("dashboard.checkInCta")}
          </Button>
        </Card>
      )}

      {/* Shortcuts — colour-coded, so they can be found without reading. */}
      <div className="grid grid-cols-3 gap-3">
        {SHORTCUTS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="relative flex flex-col items-center gap-2 rounded-card border border-border/60 bg-card p-3 text-center shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IconTile icon={l.icon} hue={l.hue} size="lg" />
            <span className="text-sm font-semibold leading-tight text-fg">{t(l.key)}</span>
            {l.href === "/reports" && unreadReports > 0 && (
              <span
                className="absolute right-2 top-2 grid min-w-5 place-items-center rounded-pill bg-danger px-1.5 text-[0.65rem] font-bold text-danger-fg"
                aria-hidden
              >
                {unreadReports}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Next reward */}
      {next && (
        <Link
          href="/rewards"
          className="rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="flex items-center gap-4">
            <IconTile icon={next.rung.icon} hue="amber" size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted">{t("dashboard.nextReward")}</p>
              <p className="line-clamp-2 text-base font-bold leading-tight text-fg">
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
        <IconTile icon="Wallet" hue="emerald" size="lg" />
        <div>
          <div className="text-2xl font-bold tabular-nums text-fg">{formatINR(saved)}</div>
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
          <span className="grid size-14 shrink-0 place-items-center rounded-tile bg-sos-gradient">
            <Icon name="LifeBuoy" className="size-7" strokeWidth={2.25} />
          </span>
          <div className="flex-1">
            <p className="text-base font-bold text-fg">{t("dashboard.cravingNow")}</p>
            <p className="text-sm text-muted">{t("dashboard.openSos")}</p>
          </div>
          <Icon name="ChevronRight" className="size-5 text-muted" />
        </Card>
      </Link>

      <CheckIn open={checkInOpen} onClose={() => setCheckInOpen(false)} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
