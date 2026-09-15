import { Sunrise } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The brand mark: a sunrise on the brand gradient. A new day, not a plant —
 * the app is about the life after tobacco, and the old leaf read as the
 * thing people are trying to leave behind. Matches app/icon.svg.
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
      <span className="grid size-10 shrink-0 place-items-center rounded-tile bg-brand-gradient shadow-float">
        <Sunrise className="size-6" strokeWidth={2.25} aria-hidden />
      </span>
      {!iconOnly && (
        <span className="text-lg font-bold tracking-tight text-fg">QuitTobacco</span>
      )}
    </span>
  );
}
