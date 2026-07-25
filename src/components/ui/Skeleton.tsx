import { cn } from "@/lib/cn";

/** Loading placeholder. The pulse collapses to nothing under reduced-motion. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-card bg-surface-2", className)} aria-hidden />
  );
}
