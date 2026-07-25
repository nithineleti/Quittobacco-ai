"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { triggerById } from "@/data/triggers";
import { loc } from "@/data/types";
import { formatDate } from "@/lib/format";
import { nextRewardSel } from "@/lib/selectors";
import { useHydrated, useStore } from "@/lib/store";

const HABITS = [
  { icon: "Droplets", key: "plan.habitWater" },
  { icon: "Footprints", key: "plan.habitWalk" },
  { icon: "Wind", key: "plan.habitBreathe" },
  { icon: "Sparkles", key: "plan.habitBrush" },
];

export function PlanScreen() {
  const hydrated = useHydrated();
  const { t } = useTranslation();
  const s = useStore();

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const lang = s.language;
  const triggerIds = s.intakeAnswers?.triggers ?? [];
  const next = nextRewardSel(s, new Date());

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold text-fg">{t("plan.title")}</h1>
        <p className="text-sm text-muted">{t("plan.sub")}</p>
      </header>

      <Card className="flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-pill bg-primary-soft text-primary">
          <Icon name="Calendar" className="size-6" />
        </span>
        <div>
          <p className="text-sm text-muted">{t("plan.quitDate")}</p>
          <p className="text-base font-semibold text-fg">
            {s.quitDate ? formatDate(s.quitDate, lang === "hi" ? "hi-IN" : "en-IN") : "—"}
          </p>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-base font-semibold text-fg">{t("plan.yourTriggers")}</p>
        <ul className="flex flex-col gap-3">
          {triggerIds.map((id) => {
            const tr = triggerById(id);
            if (!tr) return null;
            return (
              <li key={id} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-pill bg-surface-2 text-primary">
                  <Icon name={tr.icon} className="size-5" />
                </span>
                <div>
                  <p className="text-base font-semibold text-fg">{loc(tr.label, lang)}</p>
                  <p className="text-sm text-muted">{loc(tr.coping, lang)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-base font-semibold text-fg">{t("plan.dailyHabits")}</p>
        <ul className="flex flex-col gap-2">
          {HABITS.map((h) => (
            <li key={h.key} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-pill bg-success-soft text-success">
                <Icon name={h.icon} className="size-5" />
              </span>
              <p className="text-base text-fg">{t(h.key)}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3 bg-gold-soft">
        <p className="text-base font-semibold text-fg">{t("plan.rewardLadderTitle")}</p>
        {next && (
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-pill bg-gold-fill text-gold-fg">
              <Icon name={next.rung.icon} className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted">{t("plan.nextReward")}</p>
              <p className="text-base font-semibold text-fg">
                {t(`rewards.ladder.${next.rung.id}.title`)}
              </p>
            </div>
          </div>
        )}
        <Link href="/rewards" className={buttonClasses({ variant: "gold", full: true })}>
          {t("plan.viewRewards")}
        </Link>
      </Card>
    </div>
  );
}
