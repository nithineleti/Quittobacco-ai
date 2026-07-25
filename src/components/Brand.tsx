import { Leaf } from "lucide-react";
import { cn } from "@/lib/cn";

export function Brand({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-pill bg-primary text-primary-fg">
        <Leaf className="size-5" aria-hidden />
      </span>
      {!iconOnly && (
        <span className="text-lg font-semibold text-fg">QuitTobacco</span>
      )}
    </span>
  );
}
