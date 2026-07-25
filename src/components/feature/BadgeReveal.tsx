"use client";

import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { Confetti } from "@/components/feature/Confetti";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BADGE_META } from "@/data/badges";
import { loc } from "@/data/types";
import type { BadgeTier, NextTier } from "@/lib/scoring";
import { useStore } from "@/lib/store";

export function BadgeReveal({
  tier,
  next,
  variant = "onboarding",
  onContinue,
  ctaLabel,
}: {
  tier: BadgeTier;
  next: NextTier | null;
  variant?: "onboarding" | "unlock";
  onContinue?: () => void;
  ctaLabel?: string;
}) {
  const { t } = useTranslation();
  const lang = useStore((s) => s.language);
  const meta = BADGE_META[tier];

  const needs = next
    ? [
        next.need.days > 0 && t("badge.needDays", { count: next.need.days }),
        next.need.scans > 0 && t("badge.needScans", { count: next.need.scans }),
        next.need.videos > 0 && t("badge.needVideos", { count: next.need.videos }),
      ].filter((x): x is string => Boolean(x))
    : [];

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-6 grid place-items-center">
        <Confetti />
        <span
          className="absolute size-40 rounded-pill bg-gold-fill/25 animate-ring-out"
          aria-hidden
        />
        <span
          className={`animate-pop grid size-32 place-items-center rounded-pill shadow-float ${meta.fill} ${meta.fg}`}
        >
          <Icon name={meta.icon} className="size-16" />
        </span>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-gold">
        {variant === "onboarding" ? t("badge.youreStarting") : t("badge.unlocked")}
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-fg">
        {t("badge.member", { tier: loc(meta.name, lang) })}
      </h1>
      <p className="mt-2 max-w-xs text-base text-muted">
        {variant === "onboarding" ? t("badge.firstRewardNote") : loc(meta.blurb, lang)}
      </p>

      {next && (
        <Card className="mt-6 w-full text-left">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-pill bg-gold-soft text-gold">
              <Icon name={BADGE_META[next.tier].icon} className="size-6" />
            </span>
            <div>
              <p className="text-sm text-muted">{t("badge.howToEarn")}</p>
              <p className="text-base font-semibold text-fg">
                {t("badge.nextUp", { tier: loc(BADGE_META[next.tier].name, lang) })}
              </p>
            </div>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {needs.length > 0 ? (
              needs.map((n) => (
                <li key={n} className="flex items-center gap-2 text-base text-fg">
                  <Icon name="ChevronRight" className="size-4 shrink-0 text-primary" />
                  {n}
                </li>
              ))
            ) : (
              <li className="text-base text-fg">{t("badge.alreadyThere")}</li>
            )}
          </ul>
        </Card>
      )}

      {onContinue && (
        <Button size="lg" full className="mt-6" onClick={onContinue}>
          {ctaLabel ?? t("badge.toDashboard")}
        </Button>
      )}
    </div>
  );
}
