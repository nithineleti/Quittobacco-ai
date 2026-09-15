import { Sunrise } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The signature progress visual: a ring that fills as the body recovers, with
 * a sunrise at its centre. Replaces the old growing-plant illustration — the
 * ring is the same "look how far you've come" at a glance, without the leaf
 * imagery that read as tobacco itself.
 *
 * Pure SVG, colours via currentColor so it sits on the gradient hero (white
 * on colour) and on a plain card (brand colour on white) with no extra props.
 */
export function RecoveryRing({
  percent,
  size = 112,
  stroke = 10,
  label,
  className,
  children,
}: {
  /** 0–100. */
  percent: number;
  size?: number;
  stroke?: number;
  label: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={label}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="fill-none stroke-current opacity-25"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="fill-none stroke-current transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {children ?? (
          <div className="flex flex-col items-center leading-none">
            <Sunrise className="mb-1 size-6" strokeWidth={2.25} aria-hidden />
            <span className="text-xl font-bold tabular-nums">{Math.round(pct)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
