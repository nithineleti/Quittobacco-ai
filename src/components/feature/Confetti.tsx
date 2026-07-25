import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

// Deterministic particle field (computed once at import — no randomness in render).
const N = 18;
const COLORS = ["bg-gold-fill", "bg-primary", "bg-success", "bg-plant-leaf-2"];
const PARTICLES = Array.from({ length: N }, (_, i) => {
  const ang = (i / N) * Math.PI * 2 + (i % 2 ? 0.25 : -0.25);
  const dist = 66 + (i % 4) * 22;
  return {
    tx: Math.round(Math.cos(ang) * dist),
    ty: Math.round(Math.sin(ang) * dist - 8),
    rot: (i % 2 ? 1 : -1) * (120 + i * 14),
    color: COLORS[i % COLORS.length],
    w: 6 + (i % 3) * 2,
    dur: 800 + (i % 5) * 130,
    delay: (i % 4) * 25,
  };
});

/**
 * A one-shot confetti burst emanating from the centre of its (relative) parent.
 * Decorative only (aria-hidden); collapses to nothing under reduced-motion.
 */
export function Confetti({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-10 grid place-items-center", className)}
      aria-hidden
    >
      <div className="relative">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className={cn("absolute block rounded-[2px]", p.color, "animate-confetti")}
            style={
              {
                width: p.w,
                height: p.w * 1.7,
                "--tx": `${p.tx}px`,
                "--ty": `${p.ty}px`,
                "--rot": `${p.rot}deg`,
                "--dur": `${p.dur}ms`,
                animationDelay: `${p.delay}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
