"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";

/**
 * Scratch-to-reveal card. Canvas masking for the drag gesture, PLUS a real
 * "Reveal" button so it's fully usable by keyboard and screen readers — a drag
 * is never the only way to claim (§9, §3.6).
 */
export function ScratchCard({
  coverLabel,
  onReveal,
  children,
  className,
}: {
  coverLabel: string;
  onReveal?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const moves = useRef(0);
  const revealedRef = useRef(false);
  const [revealed, setRevealed] = useState(false);

  const reveal = () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setRevealed(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([20, 40, 20]);
    onReveal?.();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const cs = getComputedStyle(document.documentElement);
    const gold = cs.getPropertyValue("--gold-fill").trim() || "#e3a82b";
    const goldFg = cs.getPropertyValue("--gold-fg").trim() || "#2a2008";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = wrap.getBoundingClientRect();
    canvas.width = Math.max(1, rect.width * dpr);
    canvas.height = Math.max(1, rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    grad.addColorStop(0, gold);
    grad.addColorStop(1, goldFg);
    ctx.fillStyle = gold;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = goldFg;
    ctx.font = "600 15px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(coverLabel, rect.width / 2, rect.height / 2);
  }, [coverLabel]);

  const scratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(clientX - rect.left, clientY - rect.top, 24, 0, Math.PI * 2);
    ctx.fill();
    moves.current += 1;
    if (moves.current % 8 === 0) checkCleared();
  };

  const checkCleared = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let clear = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 24) {
      total += 1;
      if (data[i] === 0) clear += 1;
    }
    if (total > 0 && clear / total > 0.5) reveal();
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div ref={wrapRef} className="relative overflow-hidden rounded-card shadow-float">
        {children}
        {!revealed && (
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={coverLabel}
            className="absolute inset-0 h-full w-full cursor-pointer touch-none select-none"
            onPointerDown={(e) => {
              drawing.current = true;
              e.currentTarget.setPointerCapture?.(e.pointerId);
              scratch(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (drawing.current) scratch(e.clientX, e.clientY);
            }}
            onPointerUp={() => {
              drawing.current = false;
            }}
            onPointerLeave={() => {
              drawing.current = false;
            }}
          />
        )}
      </div>
      {!revealed && (
        <button
          type="button"
          onClick={reveal}
          className="min-h-11 self-center rounded-pill px-4 text-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("rewards.revealBtn")}
        </button>
      )}
    </div>
  );
}
