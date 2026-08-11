import { cn } from "@/lib/cn";

type Tone = "primary" | "success" | "gold";

const FILL: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  gold: "bg-gold-fill",
};

export function ProgressBar({
  value,
  tone = "primary",
  className,
  label,
}: {
  value: number;
  tone?: Tone;
  className?: string;
  /**
   * Required, not optional: a role="progressbar" with no accessible name is a
   * WCAG failure (aria-progressbar-name), and an optional prop let one call
   * site quietly ship without it.
   */
  label: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-pill bg-surface-2",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-pill transition-[width] duration-500", FILL[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
