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
import { deleteAccount, signOut, updateLanguage } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";
import { resetSync, signOutCleanup } from "@/lib/sync";
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
  const [langOpen, setLangOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
  const currentLanguageLabel =
    LANGUAGES.find((l) => l.code === lang)?.label ?? LANGUAGES[0].label;
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
    // Drop the sync mark too, or the next load would treat the now-empty
    // device as authoritative and wipe the server copy.
    resetSync();
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

      {/* Language — collapsed to one row; the chevron opens the choices. */}
      <Card padded={false} className="overflow-hidden">
        <button
          type="button"
          onClick={() => setLangOpen((o) => !o)}
          aria-expanded={langOpen}
          aria-controls="language-options"
          className="flex min-h-14 w-full items-center gap-3 px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <Icon name="Globe" className="size-5 text-muted" />
          <span className="flex-1 text-base font-semibold text-fg">
            {t("profile.language")}
          </span>
          {/* The current choice stays visible while collapsed. */}
          <span className="text-base text-muted">{currentLanguageLabel}</span>
          <Icon
            name="ChevronDown"
            className={cn(
              "size-5 shrink-0 text-muted transition-transform",
              langOpen && "rotate-180",
            )}
          />
        </button>

        {langOpen && (
          <div
            id="language-options"
            role="radiogroup"
            aria-label={t("profile.language")}
            className="flex flex-col border-t border-border"
          >
            {LANGUAGES.map((l) => {
              const active = lang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    // Device first so the UI switches instantly, then the
                    // account so the choice survives a reinstall or new phone.
                    setLanguage(l.code as Language);
                    void updateLanguage(l.code);
                    setLangOpen(false);
                  }}
                  className={cn(
                    "flex min-h-14 items-center gap-3 pl-12 pr-4 text-left text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    active
                      ? "bg-primary-soft font-semibold text-primary"
                      : "text-fg hover:bg-surface-2",
                  )}
                >
                  <span className="flex-1">{l.label}</span>
                  {active && <Icon name="Check" className="size-5 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
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

      {/* Sign out is a plain form post so it works with JS still loading. */}
      <form
        action={async () => {
          // Save anything outstanding, then clear this device before the
          // session goes — see signOutCleanup.
          await signOutCleanup();
          await signOut();
        }}
      >
        <Button type="submit" variant="secondary" full>
          <Icon name="LogOut" className="size-5" />
          {t("auth.signOut")}
        </Button>
      </form>

      {/* Erasing the account is separate from clearing the device: one removes
          your data from the server, the other from this phone. */}
      <Button
        variant="ghost"
        onClick={() => setDeleteOpen(true)}
        className="text-danger"
      >
        <Icon name="Trash2" className="size-5" />
        {t("profile.deleteAccountBtn")}
      </Button>

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

      {/* Delete account — irreversible, and it removes server-side data, so it
          gets its own confirmation rather than sharing the "clear device" one. */}
      <Sheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("profile.deleteAccountTitle")}
      >
        <div className="flex flex-col gap-4">
          <p className="text-base text-fg">{t("profile.deleteAccountBody")}</p>
          <form
            action={async () => {
              // Wipe this device too, so deleting the account doesn't leave the
              // previous user's streak and scans behind on a shared phone.
              resetAll();
              resetSync();
              await deleteAccount();
            }}
          >
            <Button type="submit" variant="danger" size="lg" full>
              {t("profile.deleteAccountConfirm")}
            </Button>
          </form>
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
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
