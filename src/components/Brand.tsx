import { cn } from "@/lib/cn";

/**
 * The brand mark: a ring with a full stop inside it — the day you stopped.
 * Ink and one dot of the accent, nothing else, so it sits quietly next to a
 * serif wordmark. Matches app/icon.svg.
 */
export function Brand({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className="grid size-9 shrink-0 place-items-center rounded-pill border-2 border-fg"
        aria-hidden
      >
        <span className="size-2.5 rounded-pill bg-accent" />
      </span>
      {!iconOnly && (
        <span className="font-display text-xl font-medium tracking-tight text-fg">
          QuitTobacco
        </span>
      )}
    </span>
  );
}
