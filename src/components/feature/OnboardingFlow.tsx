"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BadgeReveal } from "@/components/feature/BadgeReveal";
import { TRIGGERS } from "@/data/triggers";
import { loc, type Language } from "@/data/types";
import { LANGUAGES } from "@/i18n/languages";
import { cn } from "@/lib/cn";
import {
  currentBadge,
  formForType,
  type IntakeAnswers,
  type IntakeSummary,
  type NextTier,
  type SwallowJuice,
  type TimeToFirst,
  type TobaccoType,
} from "@/lib/scoring";
import { useStore } from "@/lib/store";

type Phase = "language" | "intro" | "form" | "reveal";

const STEP_KEYS = [
  "type",
  "timeToFirst",
  "quantity",
  "instrument4",
  "hateFirst",
  "moreInMorning",
  "whenIll",
  "years",
  "spend",
  "attempts",
  "motivation",
  "triggers",
] as const;

// ---- small inputs ----------------------------------------------------------

function OptionCards<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string }[];
  value?: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(o.value)}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-card border p-4 text-left text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary-soft text-fg"
                : "border-border bg-card text-fg hover:bg-surface-2",
            )}
          >
            <span className="flex-1">{o.label}</span>
            {active && <Icon name="Check" className="size-5 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}

function YesNo({
  value,
  onSelect,
  yes,
  no,
}: {
  value?: boolean;
  onSelect: (v: boolean) => void;
  yes: string;
  no: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { v: true, l: yes },
        { v: false, l: no },
      ].map(({ v, l }) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={value === v}
          onClick={() => onSelect(v)}
          className={cn(
            "min-h-16 rounded-card border text-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === v
              ? "border-primary bg-primary-soft text-primary"
              : "border-border bg-card text-fg hover:bg-surface-2",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  unit,
  prefix,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  unit?: string;
  prefix?: string;
}) {
  const btn =
    "grid size-14 place-items-center rounded-pill border border-border bg-card text-fg hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="flex items-center justify-center gap-5">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(min, value - step))}
        className={btn}
      >
        <Icon name="Minus" className="size-6" />
      </button>
      <div className="min-w-28 text-center">
        <div className="text-3xl font-semibold tabular-nums text-fg">
          {prefix}
          {value}
        </div>
        {unit && <div className="text-sm text-muted">{unit}</div>}
      </div>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(value + step)}
        className={btn}
      >
        <Icon name="Plus" className="size-6" />
      </button>
    </div>
  );
}

// ---- flow ------------------------------------------------------------------

export function OnboardingFlow() {
  const router = useRouter();
  const { t } = useTranslation();
  const lang = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);
  const completeIntake = useStore((s) => s.completeIntake);

  const [phase, setPhase] = useState<Phase>("language");
  const [intro, setIntro] = useState(0);
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Partial<IntakeAnswers>>({ triggers: [], motivation: 5 });
  const [reveal, setReveal] = useState<{ summary: IntakeSummary; next: NextTier | null } | null>(
    null,
  );

  const form = a.tobaccoType ? formForType(a.tobaccoType) : "smokeless";
  const patch = (p: Partial<IntakeAnswers>) => setA((prev) => ({ ...prev, ...p }));

  const isAnswered = (key: (typeof STEP_KEYS)[number]): boolean => {
    switch (key) {
      case "type":
        return a.tobaccoType != null;
      case "timeToFirst":
        return a.timeToFirst != null;
      case "quantity":
        return form === "smoked" ? a.perDay != null : a.cansPerWeek != null;
      case "instrument4":
        return form === "smoked" ? a.difficultRefraining != null : a.swallowJuice != null;
      case "hateFirst":
        return a.hateToGiveUpFirst != null;
      case "moreInMorning":
        return a.moreInMorning != null;
      case "whenIll":
        return a.useWhenIll != null;
      case "years":
        return a.yearsOfUse != null;
      case "spend":
        return a.perDaySpend != null;
      case "attempts":
        return a.previousQuitAttempts != null;
      case "motivation":
        return a.motivation != null;
      case "triggers":
        return (a.triggers?.length ?? 0) > 0;
    }
  };

  const submit = () => {
    const answers: IntakeAnswers = {
      tobaccoType: a.tobaccoType!,
      timeToFirst: a.timeToFirst!,
      hateToGiveUpFirst: a.hateToGiveUpFirst!,
      moreInMorning: a.moreInMorning!,
      useWhenIll: a.useWhenIll!,
      difficultRefraining: a.difficultRefraining,
      perDay: a.perDay,
      swallowJuice: a.swallowJuice,
      cansPerWeek: a.cansPerWeek,
      yearsOfUse: a.yearsOfUse ?? 0,
      perDaySpend: a.perDaySpend ?? 0,
      previousQuitAttempts: a.previousQuitAttempts ?? 0,
      motivation: a.motivation ?? 5,
      triggers: a.triggers ?? [],
    };
    const summary = completeIntake(answers);
    const info = currentBadge(summary.startingTier, {
      daysFree: 0,
      scansCompleted: 0,
      videosCompleted: 0,
    });
    setReveal({ summary, next: info.next });
    setPhase("reveal");
  };

  const goNext = () => {
    if (step === STEP_KEYS.length - 1) submit();
    else setStep((s) => s + 1);
  };
  const goBack = () => {
    if (step === 0) setPhase("intro");
    else setStep((s) => s - 1);
  };

  // ---- language ----
  if (phase === "language") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <Brand />
          <h1 className="text-2xl font-semibold text-fg">{t("onboarding.chooseLanguage")}</h1>
          <p className="text-base text-muted">{t("onboarding.languageSub")}</p>
        </div>
        <div className="flex flex-col gap-3">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLanguage(l.code as Language);
                setPhase("intro");
              }}
              className="flex min-h-16 items-center justify-between rounded-card border border-border bg-card px-5 text-lg font-semibold text-fg hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {l.label}
              <Icon name="ChevronRight" className="size-5 text-muted" />
            </button>
          ))}
        </div>
      </main>
    );
  }

  // ---- intro ----
  if (phase === "intro") {
    const slides = [
      { icon: "HeartPulse", title: t("onboarding.slide1Title"), body: t("onboarding.slide1Body"), tone: "primary" },
      { icon: "Gift", title: t("onboarding.slide2Title"), body: t("onboarding.slide2Body"), tone: "gold" },
      { icon: "ShieldCheck", title: t("onboarding.slide3Title"), body: t("onboarding.slide3Body"), tone: "success" },
    ] as const;
    const s = slides[intro];
    const last = intro === slides.length - 1;
    const toneBlock: Record<string, string> = {
      primary: "bg-primary-soft text-primary",
      gold: "bg-gold-soft text-gold",
      success: "bg-success-soft text-success",
    };
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-8">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setPhase("form")}
            className="min-h-11 rounded-pill px-4 text-sm font-semibold text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("common.skip")}
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div
            key={intro}
            className={cn(
              "animate-fade-in grid size-40 place-items-center rounded-card",
              toneBlock[s.tone],
            )}
          >
            <Icon name={s.icon} className="size-20" />
          </div>
          <div key={`t-${intro}`} className="animate-fade-in flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-fg">{s.title}</h1>
            <p className="max-w-xs text-base text-muted">{s.body}</p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex justify-center gap-2" aria-hidden>
            {slides.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 rounded-pill transition-all",
                  i === intro ? "w-6 bg-primary" : "w-2 bg-border",
                )}
              />
            ))}
          </div>
          <Button
            size="lg"
            full
            onClick={() => (last ? setPhase("form") : setIntro((i) => i + 1))}
          >
            {last ? t("common.getStarted") : t("common.next")}
          </Button>
        </div>
      </main>
    );
  }

  // ---- reveal ----
  if (phase === "reveal" && reveal) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
        <BadgeReveal
          tier={reveal.summary.startingTier}
          next={reveal.next}
          variant="onboarding"
          onContinue={() => router.replace("/dashboard")}
        />
      </main>
    );
  }

  // ---- form ----
  const key = STEP_KEYS[step];
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t("common.back")}
          onClick={goBack}
          className="grid size-11 place-items-center rounded-pill text-muted hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name="ChevronLeft" className="size-5" />
        </button>
        <div className="flex-1">
          <ProgressBar
            value={((step + 1) / STEP_KEYS.length) * 100}
            label={t("onboarding.stepOf", { current: step + 1, total: STEP_KEYS.length })}
          />
        </div>
        <span className="text-sm tabular-nums text-muted">
          {step + 1}/{STEP_KEYS.length}
        </span>
      </header>

      <div key={key} className="animate-fade-in flex flex-1 flex-col justify-center py-6">
        <h1 className="mb-6 text-2xl font-semibold text-fg">{questionTitle(key, form, t)}</h1>

        {key === "type" && (
          <OptionCards<TobaccoType>
            value={a.tobaccoType}
            onSelect={(v) =>
              patch({
                tobaccoType: v,
                perDay: a.perDay ?? 10,
                cansPerWeek: a.cansPerWeek ?? 2,
                yearsOfUse: a.yearsOfUse ?? 5,
                perDaySpend: a.perDaySpend ?? 50,
                previousQuitAttempts: a.previousQuitAttempts ?? 1,
              })
            }
            options={[
              { value: "cigarettes", label: t("q.type.cigarettes") },
              { value: "bidi", label: t("q.type.bidi") },
              { value: "gutkha", label: t("q.type.gutkha") },
              { value: "khaini", label: t("q.type.khaini") },
              { value: "mixed", label: t("q.type.mixed") },
            ]}
          />
        )}

        {key === "timeToFirst" && (
          <OptionCards<TimeToFirst>
            value={a.timeToFirst}
            onSelect={(v) => patch({ timeToFirst: v })}
            options={[
              { value: "within5", label: t("q.timeToFirst.within5") },
              { value: "6to30", label: t("q.timeToFirst.6to30") },
              { value: "31to60", label: t("q.timeToFirst.31to60") },
              { value: "after60", label: t("q.timeToFirst.after60") },
            ]}
          />
        )}

        {key === "quantity" &&
          (form === "smoked" ? (
            <Stepper
              value={a.perDay ?? 10}
              onChange={(n) => patch({ perDay: n })}
              unit={t("q.perDay.unit")}
            />
          ) : (
            <Stepper
              value={a.cansPerWeek ?? 2}
              onChange={(n) => patch({ cansPerWeek: n })}
              unit={t("q.cansPerWeek.unit")}
            />
          ))}

        {key === "instrument4" &&
          (form === "smoked" ? (
            <YesNo
              value={a.difficultRefraining}
              onSelect={(v) => patch({ difficultRefraining: v })}
              yes={t("common.yes")}
              no={t("common.no")}
            />
          ) : (
            <OptionCards<SwallowJuice>
              value={a.swallowJuice}
              onSelect={(v) => patch({ swallowJuice: v })}
              options={[
                { value: "never", label: t("q.swallowJuice.never") },
                { value: "sometimes", label: t("q.swallowJuice.sometimes") },
                { value: "always", label: t("q.swallowJuice.always") },
              ]}
            />
          ))}

        {key === "hateFirst" && (
          <YesNo
            value={a.hateToGiveUpFirst}
            onSelect={(v) => patch({ hateToGiveUpFirst: v })}
            yes={t("common.yes")}
            no={t("common.no")}
          />
        )}
        {key === "moreInMorning" && (
          <YesNo
            value={a.moreInMorning}
            onSelect={(v) => patch({ moreInMorning: v })}
            yes={t("common.yes")}
            no={t("common.no")}
          />
        )}
        {key === "whenIll" && (
          <YesNo
            value={a.useWhenIll}
            onSelect={(v) => patch({ useWhenIll: v })}
            yes={t("common.yes")}
            no={t("common.no")}
          />
        )}

        {key === "years" && (
          <Stepper
            value={a.yearsOfUse ?? 5}
            onChange={(n) => patch({ yearsOfUse: n })}
            unit={t("q.years.unit")}
          />
        )}
        {key === "spend" && (
          <div className="flex flex-col gap-3">
            <Stepper
              value={a.perDaySpend ?? 50}
              onChange={(n) => patch({ perDaySpend: n })}
              step={10}
              prefix="₹"
            />
            <p className="text-center text-sm text-muted">{t("q.spend.hint")}</p>
          </div>
        )}
        {key === "attempts" && (
          <Stepper
            value={a.previousQuitAttempts ?? 1}
            onChange={(n) => patch({ previousQuitAttempts: n })}
            unit={t("q.attempts.unit")}
          />
        )}

        {key === "motivation" && (
          <Card className="flex flex-col gap-3">
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={a.motivation ?? 5}
              onChange={(e) => patch({ motivation: Number(e.target.value) })}
              aria-label={t("q.motivation.label")}
              className="h-2 w-full accent-[var(--primary)]"
            />
            <div className="flex items-center justify-between text-sm text-muted">
              <span>{t("q.motivation.low")}</span>
              <span className="text-lg font-semibold tabular-nums text-primary">
                {a.motivation ?? 5}/10
              </span>
              <span>{t("q.motivation.high")}</span>
            </div>
          </Card>
        )}

        {key === "triggers" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">{t("q.triggers.sub")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TRIGGERS.map((tr) => {
                const active = a.triggers?.includes(tr.id) ?? false;
                return (
                  <button
                    key={tr.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      patch({
                        triggers: active
                          ? (a.triggers ?? []).filter((x) => x !== tr.id)
                          : [...(a.triggers ?? []), tr.id],
                      })
                    }
                    className={cn(
                      "inline-flex min-h-12 items-center gap-2 rounded-pill border px-4 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-card text-fg hover:bg-surface-2",
                    )}
                  >
                    <Icon name={tr.icon} className="size-5" />
                    {loc(tr.label, lang)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Button size="lg" full disabled={!isAnswered(key)} onClick={goNext}>
        {step === STEP_KEYS.length - 1 ? t("common.continue") : t("common.next")}
      </Button>
    </main>
  );
}

function questionTitle(
  key: (typeof STEP_KEYS)[number],
  form: "smoked" | "smokeless",
  t: (k: string) => string,
): string {
  switch (key) {
    case "type":
      return t("q.type.label");
    case "timeToFirst":
      return t("q.timeToFirst.label");
    case "quantity":
      return form === "smoked" ? t("q.perDay.label") : t("q.cansPerWeek.label");
    case "instrument4":
      return form === "smoked" ? t("q.difficultRefraining.label") : t("q.swallowJuice.label");
    case "hateFirst":
      return t("q.hateFirst.label");
    case "moreInMorning":
      return t("q.moreInMorning.label");
    case "whenIll":
      return t("q.whenIll.label");
    case "years":
      return t("q.years.label");
    case "spend":
      return t("q.spend.label");
    case "attempts":
      return t("q.attempts.label");
    case "motivation":
      return t("q.motivation.label");
    case "triggers":
      return t("q.triggers.label");
  }
}
