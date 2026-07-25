import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** default padding (§6: one card padding). Set false for image-led cards. */
  padded?: boolean;
  /** the one soft shadow, reserved for genuinely floating things. */
  float?: boolean;
}

export function Card({
  padded = true,
  float = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-card",
        padded && "p-5",
        float && "shadow-float",
        className,
      )}
      {...props}
    />
  );
}
