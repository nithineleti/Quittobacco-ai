import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "primary" | "gold" | "success";

const TONE: Record<Tone, string> = {
  primary: "text-primary",
  gold: "text-gold-fill",
  success: "text-success",
};

/** Circular progress ring. Progress colour comes from a token via currentColor. */
export function Ring({
  value,
  size = 96,
  stroke = 8,
  tone = "primary",
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  label?: string;
  children?: ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={label}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="fill-none stroke-surface-2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          stroke="currentColor"
          className={cn("fill-none transition-[stroke-dashoffset] duration-700", TONE[tone])}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center text-center">{children}</div>}
    </div>
  );
}
