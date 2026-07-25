"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

type Variant = "478" | "46";
type PhaseKey = "in" | "hold" | "out";

const V: Record<
  Variant,
  { phases: { k: PhaseKey; s: number }[]; anim: string; cycle: number }
> = {
  "478": { phases: [{ k: "in", s: 4 }, { k: "hold", s: 7 }, { k: "out", s: 8 }], anim: "animate-breathe-478", cycle: 19 },
  "46": { phases: [{ k: "in", s: 4 }, { k: "out", s: 6 }], anim: "animate-breathe-46", cycle: 10 },
};

function phaseAt(phases: { k: PhaseKey; s: number }[], el: number): { k: PhaseKey; left: number } {
  let acc = 0;
  for (const p of phases) {
    if (el < acc + p.s) return { k: p.k, left: acc + p.s - el };
    acc += p.s;
  }
  const last = phases[phases.length - 1];
  return { k: last.k, left: 0 };
}

/** Paced-breathing guide. Works fully offline; haptics where supported. */
export function BreathingCircle({
  variant = "478",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const { t } = useTranslation();
  const v = V[variant];
  const lastPhase = useRef<PhaseKey | "">("");
  const [phase, setPhase] = useState<{ k: PhaseKey; left: number }>({
    k: v.phases[0].k,
    left: v.phases[0].s,
  });

  // Time math lives in the interval (effects may be impure); render reads state.
  useEffect(() => {
    lastPhase.current = "";
    const start = Date.now();
    const id = setInterval(() => {
      const el = ((Date.now() - start) / 1000) % v.cycle;
      const p = phaseAt(v.phases, el);
      if (p.k !== lastPhase.current) {
        lastPhase.current = p.k;
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20);
      }
      setPhase(p);
    }, 250);
    return () => clearInterval(id);
  }, [v]);

  const label =
    phase.k === "in" ? t("sos.breatheIn") : phase.k === "hold" ? t("sos.hold") : t("sos.breatheOut");

  return (
    <div className={cn("relative grid size-64 place-items-center", className)}>
      <div className="absolute size-64 rounded-pill bg-primary-soft" aria-hidden />
      <div className={cn("size-64 rounded-pill bg-primary/25", v.anim)} aria-hidden />
      <div className="absolute flex flex-col items-center" aria-live="polite">
        <span className="text-lg font-semibold text-primary">{label}</span>
        <span className="text-4xl font-semibold tabular-nums text-fg">{Math.ceil(phase.left)}</span>
      </div>
    </div>
  );
}
