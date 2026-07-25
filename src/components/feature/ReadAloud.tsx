"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";

/** Read-aloud for low-literacy support (Web Speech API), in the chosen language. */
export function ReadAloud({ text, className }: { text: string; className?: string }) {
  const { t } = useTranslation();
  const lang = useStore((s) => s.language);
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "hi" ? "hi-IN" : "en-IN";
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-pill border border-border px-4 text-sm font-semibold text-fg hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Icon name="Volume2" className="size-4" />
      {speaking ? t("learn.stopReading") : t("common.readAloud")}
    </button>
  );
}
