"use client";

import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import {
  QUITLINE,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
} from "@/data/contact";
import { loc } from "@/data/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";

export function HelpScreen() {
  const { t } = useTranslation();
  const lang = useStore((s) => s.language);

  const rows = [
    {
      icon: "Phone",
      title: loc(QUITLINE.name, lang),
      note: loc(QUITLINE.note, lang),
      value: QUITLINE.numberDisplay,
      href: `tel:${QUITLINE.tel}`,
      highlight: true,
    },
    {
      icon: "Mail",
      title: t("help.emailUs"),
      note: t("help.emailNote"),
      value: SUPPORT_EMAIL,
      href: `mailto:${SUPPORT_EMAIL}`,
      highlight: false,
    },
    {
      icon: "PhoneCall",
      title: t("help.callSupport"),
      note: t("help.phoneNote"),
      value: SUPPORT_PHONE_DISPLAY,
      href: `tel:${SUPPORT_PHONE_TEL}`,
      highlight: false,
    },
  ];

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold text-fg">{t("help.title")}</h1>
        <p className="text-sm text-muted">{t("help.sub")}</p>
      </header>

      {rows.map((r) => (
        <a
          key={r.href}
          href={r.href}
          className="rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className={cn("flex items-center gap-4", r.highlight && "bg-primary-soft")}>
            <span className="grid size-12 shrink-0 place-items-center rounded-pill bg-primary text-primary-fg">
              <Icon name={r.icon} className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-fg">{r.title}</p>
              <p className="text-sm text-muted">{r.note}</p>
              <p className="mt-0.5 text-base font-semibold text-primary">{r.value}</p>
            </div>
            <Icon name="ChevronRight" className="size-5 shrink-0 text-muted" />
          </Card>
        </a>
      ))}

      <p className="text-xs text-muted">{t("help.placeholderNote")}</p>
      <p className="flex items-center gap-2 text-xs text-muted">
        <Icon name="Info" className="size-4 shrink-0" />
        {t("help.emergency")}
      </p>
    </div>
  );
}
