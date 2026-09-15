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
        // A whisper of shadow instead of a hard border: cards read as raised
        // paper on the tinted page, which is what makes the layout feel
        // "app-like" rather than "form-like".
        "rounded-card border border-border/60 bg-card shadow-card",
        padded && "p-5",
        float && "shadow-float",
        className,
      )}
      {...props}
    />
  );
}
