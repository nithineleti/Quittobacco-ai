"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { BreathingCircle } from "@/components/feature/BreathingCircle";
import { QuickActions } from "@/components/feature/QuickActions";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { QUITLINE } from "@/data/contact";
import { RESCUE_MESSAGES, URGE_SURF_SECONDS } from "@/data/sos";
import { loc } from "@/data/types";
import { useStore } from "@/lib/store";

type Phase = "surf" | "done" | "breathe";

export function SosScreen() {
  const { t } = useTranslation();
  const lang = useStore((s) => s.language);
  const sp = useSearchParams();

  const [phase, setPhase] = useState<Phase>(sp.get("tool") === "breathe" ? "breathe" : "surf");
  const [left, setLeft] = useState(URGE_SURF_SECONDS);
  const [paused, setPaused] = useState(false);
  const leftRef = useRef(URGE_SURF_SECONDS);

  useEffect(() => {
    if (phase !== "surf" || paused) return;
    const id = setInterval(() => {
      leftRef.current -= 1;
      if (leftRef.current <= 0) {
        leftRef.current = 0;
        setLeft(0);
        clearInterval(id);
        setPhase("done");
        return;
      }
      setLeft(leftRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [phase, paused]);

  if (phase === "breathe") {
    return (
      <div className="animate-fade-in flex flex-col items-center gap-6 py-2 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-fg">{t("sos.breatheTitle")}</h1>
          <p className="mt-1 max-w-xs text-base text-muted">{t("sos.breatheSub")}</p>
        </div>
        <BreathingCircle variant="478" />
        <div className="flex w-full max-w-sm flex-col items-center gap-3">
          <Button size="lg" full onClick={() => setPhase("done")}>
            {t("sos.imOkay")}
          </Button>
          <Link href="/dashboard" className="text-sm text-muted underline-offset-2 hover:underline">
            {t("sos.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="animate-fade-in flex flex-col gap-6 py-2">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-16 place-items-center rounded-pill bg-success-soft text-success">
            <Icon name="CheckCircle2" className="size-8" />
          </span>
          <h1 className="text-2xl font-semibold text-fg">{t("sos.madeItTitle")}</h1>
          <p className="max-w-xs text-base text-muted">{t("sos.madeItBody")}</p>
        </div>

        <div>
          <h2 className="text-base font-semibold text-fg">{t("sos.quickActions")}</h2>
          <p className="mb-3 text-sm text-muted">{t("sos.quickSub")}</p>
          <QuickActions />
        </div>

        <a
          href={`tel:${QUITLINE.tel}`}
          className="flex items-center gap-3 rounded-card border border-border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-11 place-items-center rounded-pill bg-primary-soft text-primary">
            <Icon name="Phone" className="size-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm text-muted">{loc(QUITLINE.name, lang)}</p>
            <p className="text-base font-semibold text-primary">{QUITLINE.numberDisplay}</p>
          </div>
          <Icon name="ChevronRight" className="size-5 text-muted" />
        </a>
      </div>
    );
  }

  // urge-surfing
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const elapsed = Math.max(0, URGE_SURF_SECONDS - left);
  const msg = RESCUE_MESSAGES[Math.floor(elapsed / 15) % RESCUE_MESSAGES.length];
  const pct = (elapsed / URGE_SURF_SECONDS) * 100;

  return (
    <div className="animate-fade-in flex min-h-[70dvh] flex-col items-center gap-6 py-2 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-fg">{t("sos.title")}</h1>
        <p className="mt-1 max-w-sm text-base text-muted">{t("sos.surfSub")}</p>
      </div>

      <BreathingCircle variant="46" />

      <p className="flex min-h-14 max-w-xs items-center text-lg font-medium text-fg">
        {loc(msg, lang)}
      </p>

      <div className="w-full max-w-sm">
        <div className="mb-1 flex items-center justify-between text-sm text-muted">
          <span>{t("sos.timeLeft")}</span>
          <span className="tabular-nums">{mmss}</span>
        </div>
        <ProgressBar value={pct} label={t("sos.timeLeft")} />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <Button size="lg" full onClick={() => setPhase("done")}>
          {t("sos.imOkay")}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setPaused((p) => !p)}>
            {paused ? t("sos.resume") : t("sos.pause")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              leftRef.current += 60;
              setLeft(leftRef.current);
            }}
          >
            {t("sos.extend")}
          </Button>
        </div>
      </div>
    </div>
  );
}
