import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "alert"
  | "danger"
  | "gold";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  alert: "bg-alert-soft text-alert",
  danger: "bg-danger-soft text-danger",
  gold: "bg-gold-soft text-gold",
};

export function Pill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-sm font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
