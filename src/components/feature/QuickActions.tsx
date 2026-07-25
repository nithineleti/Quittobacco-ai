"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { QUICK_ACTIONS } from "@/data/quickActions";
import { loc } from "@/data/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";

const ACCENT: Record<string, string> = {
  primary: "bg-primary text-primary-fg",
  gold: "bg-gold-fill text-gold-fg",
  success: "bg-success text-success-fg",
  surface: "bg-card border border-border text-fg",
};
const ICON_TONE: Record<string, string> = {
  primary: "",
  gold: "",
  success: "",
  surface: "text-primary",
};
const SUB_TONE: Record<string, string> = {
  primary: "text-primary-fg/80",
  gold: "text-gold-fg/80",
  success: "text-success-fg/85",
  surface: "text-muted",
};

/** Image-led (illustrated gradient) action cards shown after a craving passes. */
export function QuickActions() {
  const lang = useStore((s) => s.language);
  return (
    <div className="grid grid-cols-2 gap-3">
      {QUICK_ACTIONS.map((qa) => (
        <Link
          key={qa.id}
          href={qa.href}
          className={cn(
            "flex min-h-32 flex-col justify-between rounded-card p-4 shadow-float transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            ACCENT[qa.accent],
          )}
        >
          <Icon name={qa.icon} className={cn("size-9", ICON_TONE[qa.accent])} />
          <div>
            <p className="text-lg font-semibold leading-tight">{loc(qa.label, lang)}</p>
            <p className={cn("mt-0.5 text-sm", SUB_TONE[qa.accent])}>{loc(qa.sub, lang)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
