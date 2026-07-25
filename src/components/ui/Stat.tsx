import type { ReactNode } from "react";

export function Stat({
  value,
  label,
  hint,
  className,
}: {
  value: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-2xl font-semibold tabular-nums text-fg">{value}</div>
      <div className="text-sm text-muted">{label}</div>
      {hint ? <div className="mt-0.5 text-sm text-muted">{hint}</div> : null}
    </div>
  );
}
