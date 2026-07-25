"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { ScanChecklist } from "@/components/feature/ScanChecklist";
import { ScanCompare } from "@/components/feature/ScanCompare";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Ring } from "@/components/ui/Ring";
import { Skeleton } from "@/components/ui/Skeleton";
import { scoreScan } from "@/data/scan";
import { toISODate, formatDate } from "@/lib/format";
import { putImage } from "@/lib/idb";
import { riskTone, scoreToRisk, type RiskLevel } from "@/lib/risk";
import { streakDays } from "@/lib/selectors";
import { useHydrated, useStore } from "@/lib/store";

const RISK_KEY: Record<RiskLevel, string> = {
  low: "assess.riskLow",
  moderate: "assess.riskModerate",
  high: "assess.riskHigh",
  critical: "assess.riskCritical",
};

export function AssessScreen() {
  const hydrated = useHydrated();
  const { t } = useTranslation();
  const s = useStore();
  const ackDisclaimer = useStore((st) => st.ackScanDisclaimer);
  const addScan = useStore((st) => st.addScan);
  const lang = s.language;
  const [mode, setMode] = useState<"auto" | "checklist">("auto");

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Explicit disclaimer acknowledgement before the first scan (§10).
  if (!s.scanDisclaimerAck) {
    return (
      <div className="animate-fade-in flex flex-col gap-5">
        <h1 className="text-2xl font-semibold text-fg">{t("assess.title")}</h1>
        <Card className="flex flex-col gap-3 bg-warning-soft">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-pill bg-warning text-warning-fg">
              <Icon name="Info" className="size-6" />
            </span>
            <h2 className="text-lg font-semibold text-fg">{t("assess.disclaimerTitle")}</h2>
          </div>
          <p className="text-base text-fg">{t("assess.disclaimerBody")}</p>
        </Card>
        <Button size="lg" full onClick={ackDisclaimer}>
          {t("assess.acknowledge")}
        </Button>
      </div>
    );
  }

  const onComplete = async (answers: Record<string, string>, photo: Blob | null) => {
    const id = `scan-${Date.now()}`;
    let imageKey: string | undefined;
    if (photo) {
      try {
        await putImage(id, photo);
        imageKey = id;
      } catch {
        imageKey = undefined;
      }
    }
    addScan({
      id,
      date: toISODate(new Date()),
      dayIndex: streakDays(s, new Date()),
      score: scoreScan(answers),
      answers,
      imageKey,
    });
    setMode("auto");
  };

  const scans = s.scans;
  const showChecklist = mode === "checklist" || scans.length === 0;

  if (showChecklist) {
    const isBaseline = scans.length === 0;
    return (
      <ScanChecklist
        title={isBaseline ? t("assess.baselineTitle") : t("assess.newCheckTitle")}
        sub={isBaseline ? t("assess.baselineSub") : t("assess.demoResult")}
        onComplete={onComplete}
      />
    );
  }

  const baseline = scans[0].score;
  const latest = scans[scans.length - 1];
  const delta = baseline - latest.score;
  const risk = scoreToRisk(latest.score);
  const tone = riskTone(risk);
  const needConsult = risk === "high" || risk === "critical";

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold text-fg">{t("assess.title")}</h1>
        <p className="text-sm text-muted">{t("assess.demoResult")}</p>
      </header>

      {/* On a high/critical result, the consult action is primary — above rewards, above everything (§10). */}
      {needConsult && (
        <Card className="flex flex-col gap-3 bg-danger-soft">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-pill bg-danger text-danger-fg">
              <Icon name="AlertTriangle" className="size-6" />
            </span>
            <h2 className="text-lg font-semibold text-fg">{t("assess.consultTitle")}</h2>
          </div>
          <p className="text-base text-fg">{t("assess.consultBody")}</p>
          <Link href="/help" className={buttonClasses({ variant: "danger", full: true })}>
            {t("assess.consult")}
          </Link>
        </Card>
      )}

      <Card className="flex items-center gap-5">
        <Ring value={latest.score} tone="primary" label={t("assess.scoreLabel")}>
          <div className="flex flex-col items-center leading-none">
            <span className="text-2xl font-semibold tabular-nums text-fg">{latest.score}</span>
            <span className="text-xs text-muted">/100</span>
          </div>
        </Ring>
        <div className="flex-1">
          <p className="text-sm text-muted">{t("assess.scoreLabel")}</p>
          <span
            className={`mt-1 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-sm font-semibold ${tone.softBg} ${tone.text}`}
          >
            <span className={`size-2 rounded-pill ${tone.dot}`} aria-hidden />
            {t(RISK_KEY[risk])}
          </span>
          <p className="mt-1 text-xs text-muted">{t("assess.lowerBetter")}</p>
        </div>
      </Card>

      {scans.length === 1 ? (
        <Card className="flex items-center gap-3 bg-primary-soft">
          <Icon name="Check" className="size-5 text-primary" />
          <p className="text-base font-semibold text-fg">{t("assess.baselineBadge")}</p>
        </Card>
      ) : (
        <Card
          className={
            delta > 0
              ? "flex items-center gap-3 bg-success-soft"
              : delta < 0
                ? "flex items-center gap-3 bg-alert-soft"
                : "flex items-center gap-3"
          }
        >
          <Icon
            name={delta > 0 ? "TrendingUp" : delta < 0 ? "AlertTriangle" : "Activity"}
            className={delta > 0 ? "size-6 text-success" : delta < 0 ? "size-6 text-alert" : "size-6 text-muted"}
          />
          <p className="text-base font-semibold text-fg">
            {delta > 0
              ? t("assess.sinceBaseline", { delta })
              : delta < 0
                ? t("assess.roseSince", { delta: -delta })
                : t("assess.sameSince")}
          </p>
        </Card>
      )}

      <ScanCompare scans={scans} />

      <div>
        <h2 className="mb-2 text-base font-semibold text-fg">{t("assess.history")}</h2>
        <ul className="flex flex-col gap-2">
          {[...scans].reverse().map((sc, i) => {
            const rt = riskTone(scoreToRisk(sc.score));
            return (
              <li key={sc.id}>
                <Card className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-fg">
                      {t("common.dayN", { n: sc.dayIndex })} · {formatDate(sc.date, lang === "hi" ? "hi-IN" : "en-IN")}
                    </p>
                    {i === scans.length - 1 && (
                      <p className="text-xs text-muted">{t("assess.day1")}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-pill px-3 py-1 text-sm font-semibold ${rt.softBg} ${rt.text}`}>
                    {sc.score}
                  </span>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>

      <Button size="lg" full variant="secondary" onClick={() => setMode("checklist")}>
        <Icon name="ScanLine" className="size-5" />
        {t("assess.newCheck")}
      </Button>
    </div>
  );
}
