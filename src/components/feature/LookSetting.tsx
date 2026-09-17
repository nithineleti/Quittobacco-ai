"use client";

import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { IconTile } from "@/components/ui/IconTile";
import { cn } from "@/lib/cn";
import { LOOKS, setLook, useLook, type Look } from "@/lib/look";

/** Swatch colours are the look's own page, ink and accent — chosen by eye, not by name. */
const SWATCH: Record<Look, [string, string, string]> = {
  paper: ["#f7f5f0", "#1c1a16", "#b9542e"],
  mono: ["#ffffff", "#0a0a0a", "#0a0a0a"],
  ocean: ["#eef2f6", "#142033", "#1f4f8f"],
  plum: ["#f4f1f5", "#221a26", "#6e3a72"],
};

export function LookSetting() {
  const { t } = useTranslation();
  const look = useLook();
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <IconTile icon="Palette" size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-fg">{t("profile.look")}</p>
          <p className="text-sm text-muted">{t("profile.lookHelp")}</p>
        </div>
      </div>
      <div role="radiogroup" aria-label={t("profile.look")} className="grid grid-cols-2 gap-2">
        {LOOKS.map((l) => {
          const active = look === l;
          const [page, ink, accent] = SWATCH[l];
          return (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setLook(l)}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-card border px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-accent bg-accent-soft text-fg" : "border-border bg-card text-fg hover:bg-surface-2",
              )}
            >
              <span
                className="grid size-8 shrink-0 grid-cols-2 overflow-hidden rounded-tile border border-border"
                aria-hidden
              >
                <span style={{ background: page }} />
                <span style={{ background: ink }} />
                <span style={{ background: accent }} className="col-span-2" />
              </span>
              <span className="flex-1">{t(`profile.looks.${l}`)}</span>
              {active && <Icon name="Check" className="size-4 text-accent" />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
