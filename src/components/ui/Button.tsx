import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold leading-none transition-[opacity,background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:pointer-events-none select-none";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:opacity-90",
  secondary: "bg-surface-2 text-fg hover:bg-border",
  ghost: "bg-transparent text-fg hover:bg-surface-2",
  danger: "bg-danger text-danger-fg hover:opacity-90",
  gold: "bg-gold-fill text-gold-fg hover:opacity-90",
};

const SIZES: Record<Size, string> = {
  // All ≥44px tall for reliable touch targets on cheap devices.
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-5 text-base",
  lg: "min-h-14 px-6 text-lg",
};

/** Shared class string so <Link>/<a> can look like a button too. */
export function buttonClasses(opts?: {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}): string {
  const { variant = "primary", size = "md", full } = opts ?? {};
  return cn(base, VARIANTS[variant], SIZES[size], full && "w-full");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

export function Button({
  variant,
  size,
  full,
  className,
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(buttonClasses({ variant, size, full }), className)}
      {...props}
    />
  );
}
