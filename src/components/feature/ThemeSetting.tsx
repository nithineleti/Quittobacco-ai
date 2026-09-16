"use client";

import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { IconTile } from "@/components/ui/IconTile";
import { cn } from "@/lib/cn";
import { setThemePref, useThemePref, type ThemePref } from "@/lib/theme";

const OPTIONS: { value: ThemePref; icon: string; key: string }[] = [
  { value: "light", icon: "Sun", key: "profile.themeLight" },
  { value: "dark", icon: "Moon", key: "profile.themeDark" },
  { value: "system", icon: "Smartphone", key: "profile.themeSystem" },
];

/** Light / dark / follow-the-phone. Applies instantly; remembered on this device. */
export function ThemeSetting() {
  const { t } = useTranslation();
  const pref = useThemePref();
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <IconTile icon={pref === "dark" ? "Moon" : "Sun"} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-fg">{t("profile.theme")}</p>
          <p className="text-sm text-muted">{t("profile.themeHelp")}</p>
        </div>
      </div>
      <div role="radiogroup" aria-label={t("profile.theme")} className="grid grid-cols-3 gap-1 rounded-pill bg-surface-2 p-1">
        {OPTIONS.map((o) => {
          const active = pref === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setThemePref(o.value)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-1.5 rounded-pill text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "bg-card text-fg" : "text-muted hover:text-fg",
              )}
            >
              <Icon name={o.icon} className="size-4" />
              {t(o.key)}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
