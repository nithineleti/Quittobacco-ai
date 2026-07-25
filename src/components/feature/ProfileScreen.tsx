"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Pill } from "@/components/ui/Pill";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { BADGE_META } from "@/data/badges";
import { loc, type Language } from "@/data/types";
import { LANGUAGES } from "@/i18n/languages";
import { cn } from "@/lib/cn";
import { shareText } from "@/lib/share";
import { badgeInfo, moneySavedTotal, streakDays } from "@/lib/selectors";
import { useHydrated, useStore } from "@/lib/store";

export function ProfileScreen() {
  const hydrated = useHydrated();
  const { t } = useTranslation();
  const router = useRouter();
  const s = useStore();
  const setLanguage = useStore((st) => st.setLanguage);
  const saveProgress = useStore((st) => st.saveProgress);
  const resetAll = useStore((st) => st.resetAll);

  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [clearOpen, setClearOpen] = useState(false);

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
  const badge = badgeInfo(s, new Date());
  const meta = BADGE_META[badge.tier];
  const streak = streakDays(s, new Date());

  const exportData = () => {
    const raw = localStorage.getItem("qt-storage") ?? "{}";
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quittobacco-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const doShare = () => {
    const saved = moneySavedTotal(s, new Date());
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams({
      n: s.displayName ?? "",
      d: String(streak),
      s: String(Math.round(saved)),
      l: lang,
    });
    shareText(t("supporter.shareLinkText"), `${origin}/supporter?${params.toString()}`);
  };

  const doSave = () => {
    saveProgress(name.trim() || undefined);
    setSaveOpen(false);
  };

  const doClear = () => {
    resetAll();
    setClearOpen(false);
    router.replace("/onboarding");
  };

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold text-fg">{t("profile.title")}</h1>
      </header>

      <Card className="flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-pill bg-gold-fill text-gold-fg">
          <Icon name={meta.icon} className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-semibold text-fg">
              {s.displayName ?? t("dashboard.friend")}
            </p>
            {s.isGuest && <Pill tone="neutral">{t("profile.guestTag")}</Pill>}
          </div>
          <p className="text-sm text-muted">
            {loc(meta.name, lang)} · {t("profile.dependence")} {s.intake?.ftnd ?? 0}/10 · {t("profile.readiness")} {s.intake?.readiness ?? 0}/100
          </p>
        </div>
      </Card>

      {s.isGuest && (
        <Card className="flex flex-col gap-3 bg-primary-soft">
          <div>
            <p className="text-base font-semibold text-fg">{t("profile.saveTitle")}</p>
            <p className="text-sm text-muted">{t("profile.saveBody")}</p>
          </div>
          <Button size="lg" full onClick={() => setSaveOpen(true)}>
            {t("profile.saveBtn")}
          </Button>
        </Card>
      )}

      {/* Language */}
      <Card className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-base font-semibold text-fg">
          <Icon name="Globe" className="size-5" />
          {t("profile.language")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              aria-pressed={lang === l.code}
              onClick={() => setLanguage(l.code as Language)}
              className={cn(
                "min-h-12 rounded-card border text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                lang === l.code
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-card text-fg hover:bg-surface-2",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <Card className="flex flex-col divide-y divide-border p-0">
        <ProfileRow icon="Users" label={t("profile.supporter")} onClick={doShare} />
        <ProfileRow icon="Download" label={t("profile.export")} onClick={exportData} />
        <Link
          href="/help"
          className="flex min-h-14 items-center gap-3 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <Icon name="LifeBuoy" className="size-5 text-muted" />
          <span className="flex-1 text-base text-fg">{t("profile.help")}</span>
          <Icon name="ChevronRight" className="size-5 text-muted" />
        </Link>
        <Link
          href="/admin"
          className="flex min-h-14 items-center gap-3 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <Icon name="Stethoscope" className="size-5 text-muted" />
          <span className="flex-1 text-base text-fg">{t("admin.title")}</span>
          <Icon name="ChevronRight" className="size-5 text-muted" />
        </Link>
      </Card>

      {/* Privacy */}
      <p className="flex items-start gap-2 px-1 text-sm text-muted">
        <Icon name="ShieldCheck" className="mt-0.5 size-4 shrink-0 text-success" />
        {t("profile.privacyBody")}
      </p>

      <Button variant="ghost" onClick={() => setClearOpen(true)} className="text-danger">
        <Icon name="Trash2" className="size-5" />
        {t("profile.clearBtn")}
      </Button>

      {/* Save sheet */}
      <Sheet open={saveOpen} onClose={() => setSaveOpen(false)} title={t("profile.saveTitle")}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">{t("profile.saveBody")}</p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("profile.namePlaceholder")}
            aria-label={t("profile.namePlaceholder")}
          />
          <Button size="lg" full onClick={doSave}>
            {t("profile.saveBtn")}
          </Button>
        </div>
      </Sheet>

      {/* Clear confirm sheet */}
      <Sheet open={clearOpen} onClose={() => setClearOpen(false)} title={t("profile.clearTitle")}>
        <div className="flex flex-col gap-4">
          <p className="text-base text-fg">{t("profile.clearBody")}</p>
          <Button variant="danger" size="lg" full onClick={doClear}>
            {t("profile.clearBtn")}
          </Button>
          <Button variant="ghost" onClick={() => setClearOpen(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function ProfileRow({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 items-center gap-3 px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <Icon name={icon} className="size-5 text-muted" />
      <span className="flex-1 text-base text-fg">{label}</span>
      <Icon name="ChevronRight" className="size-5 text-muted" />
    </button>
  );
}
