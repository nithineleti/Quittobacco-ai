"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { CRAVING_LEVELS, MOODS } from "@/data/checkin";
import { TRIGGERS } from "@/data/triggers";
import { loc } from "@/data/types";
import { cn } from "@/lib/cn";
import { todayISO } from "@/lib/selectors";
import { useStore } from "@/lib/store";

export function CheckIn({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const lang = useStore((s) => s.language);
  const addCheckIn = useStore((s) => s.addCheckIn);
  const logSlip = useStore((s) => s.logSlip);

  const [stage, setStage] = useState<"form" | "done">("form");
  const [craving, setCraving] = useState<number | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [used, setUsed] = useState<boolean | null>(null);
  const [trigger, setTrigger] = useState<string | undefined>();

  const canSave = craving != null && used != null;

  const reset = () => {
    setStage("form");
    setCraving(null);
    setMood(null);
    setUsed(null);
    setTrigger(undefined);
  };

  const close = () => {
    reset();
    onClose();
  };

  const save = () => {
    const date = todayISO();
    addCheckIn({
      date,
      hour: new Date().getHours(),
      cravingLevel: craving ?? 0,
      usedToday: used ?? false,
      mood: mood ?? undefined,
      triggerId: trigger,
    });
    if (used) logSlip({ date, triggerId: trigger });
    setStage("done");
  };

  return (
    <Sheet open={open} onClose={close} title={stage === "form" ? t("checkin.title") : undefined}>
      {stage === "form" ? (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted">{t("checkin.sub")}</p>

          <fieldset>
            <legend className="mb-2 text-base font-semibold text-fg">{t("checkin.craving")}</legend>
            <div className="flex justify-between gap-1">
              {CRAVING_LEVELS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={craving === c.value}
                  aria-label={loc(c.label, lang)}
                  onClick={() => setCraving(c.value)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-card border py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    craving === c.value ? "border-primary bg-primary-soft" : "border-border",
                  )}
                >
                  <span className="text-2xl" aria-hidden>{c.emoji}</span>
                  <span className="text-xs text-muted">{loc(c.label, lang)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-base font-semibold text-fg">{t("checkin.mood")}</legend>
            <div className="flex justify-between gap-1">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={mood === m.id}
                  aria-label={loc(m.label, lang)}
                  onClick={() => setMood(m.id)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-card border py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    mood === m.id ? "border-primary bg-primary-soft" : "border-border",
                  )}
                >
                  <span className="text-2xl" aria-hidden>{m.emoji}</span>
                  <span className="text-xs text-muted">{loc(m.label, lang)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-base font-semibold text-fg">{t("checkin.used")}</legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: false, l: t("common.no") },
                { v: true, l: t("common.yes") },
              ].map(({ v, l }) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={used === v}
                  onClick={() => setUsed(v)}
                  className={cn(
                    "min-h-14 rounded-card border text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    used === v
                      ? v
                        ? "border-warning bg-warning-soft text-warning"
                        : "border-success bg-success-soft text-success"
                      : "border-border bg-card text-fg hover:bg-surface-2",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </fieldset>

          {craving != null && craving >= 2 && (
            <fieldset>
              <legend className="mb-2 text-base font-semibold text-fg">{t("checkin.trigger")}</legend>
              <div className="flex flex-wrap gap-2">
                {TRIGGERS.map((tr) => (
                  <button
                    key={tr.id}
                    type="button"
                    aria-pressed={trigger === tr.id}
                    onClick={() => setTrigger(trigger === tr.id ? undefined : tr.id)}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      trigger === tr.id
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-card text-fg hover:bg-surface-2",
                    )}
                  >
                    <Icon name={tr.icon} className="size-4" />
                    {loc(tr.label, lang)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <Button size="lg" full disabled={!canSave} onClick={save}>
            {t("checkin.save")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <span
            className={cn(
              "grid size-16 place-items-center rounded-pill",
              used ? "bg-warning-soft text-warning" : "bg-success-soft text-success",
            )}
          >
            <Icon name={used ? "HeartPulse" : "CheckCircle2"} className="size-8" />
          </span>
          <h3 className="text-lg font-semibold text-fg">
            {used ? t("checkin.slipTitle") : t("checkin.savedTitle")}
          </h3>
          <p className="max-w-xs text-base text-muted">
            {used ? t("checkin.slipBody") : t("checkin.savedBody")}
          </p>
          <Button size="lg" full onClick={close}>
            {used ? t("checkin.keepGoing") : t("checkin.done")}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
