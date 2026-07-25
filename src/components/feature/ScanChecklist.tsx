"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SCAN_QUESTIONS } from "@/data/scan";
import { loc } from "@/data/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";

export function ScanChecklist({
  title,
  sub,
  onComplete,
}: {
  title: string;
  sub: string;
  onComplete: (answers: Record<string, string>, photo: Blob | null) => void;
}) {
  const { t } = useTranslation();
  const lang = useStore((s) => s.language);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<Blob | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const complete = SCAN_QUESTIONS.every((q) => answers[q.id]);

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-fg">{title}</h1>
        <p className="mt-1 text-sm text-muted">{sub}</p>
      </div>

      {SCAN_QUESTIONS.map((q) => (
        <Card key={q.id} className="flex flex-col gap-3">
          <p className="text-base font-semibold text-fg">{loc(q.label, lang)}</p>
          <div className="flex flex-wrap gap-2">
            {q.options.map((o) => {
              const active = answers[q.id] === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))}
                  className={cn(
                    "min-h-11 rounded-pill border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-card text-fg hover:bg-surface-2",
                  )}
                >
                  {loc(o.label, lang)}
                </button>
              );
            })}
          </div>
        </Card>
      ))}

      <Card className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-pill bg-surface-2 text-muted">
            <Icon name="Camera" className="size-5" />
          </span>
          <p className="text-sm text-fg">{photo ? t("assess.photoAdded") : t("assess.addPhoto")}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          aria-label={photo ? t("assess.retakePhoto") : t("assess.addPhoto")}
          onClick={() => fileRef.current?.click()}
        >
          <Icon name={photo ? "RotateCcw" : "Camera"} className="size-5" />
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPhoto(f);
          }}
        />
      </Card>

      <p className="text-xs text-muted">{t("assess.demoResult")}</p>
      <Button size="lg" full disabled={!complete} onClick={() => onComplete(answers, photo)}>
        {t("assess.save")}
      </Button>
    </div>
  );
}
