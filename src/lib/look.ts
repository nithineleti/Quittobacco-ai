"use client";

import { useSyncExternalStore } from "react";

/**
 * Which of the app's looks is active — see the "Looks" block in theme.css.
 * Same shape as theme.ts: a per-device preference in localStorage, applied
 * as data-look on <html> by the no-flash script before first paint, and
 * also settable from a link (?look=mono) so a design can be shown to
 * someone by sending them a URL.
 */
export type Look = "paper" | "mono" | "ocean" | "plum";
export const LOOKS: Look[] = ["paper", "mono", "ocean", "plum"];
export const LOOK_KEY = "qt-look";

const listeners = new Set<() => void>();

export function readLook(): Look {
  try {
    const v = localStorage.getItem(LOOK_KEY);
    return (LOOKS as string[]).includes(v ?? "") ? (v as Look) : "paper";
  } catch {
    return "paper";
  }
}

export function applyLook(look: Look): void {
  const el = document.documentElement;
  if (look === "paper") el.removeAttribute("data-look");
  else el.setAttribute("data-look", look);
}

export function setLook(look: Look): void {
  try {
    if (look === "paper") localStorage.removeItem(LOOK_KEY);
    else localStorage.setItem(LOOK_KEY, look);
  } catch {
    // Private mode — still apply for this page view.
  }
  applyLook(look);
  for (const l of listeners) l();
}

export function useLook(): Look {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readLook,
    () => "paper" as const,
  );
}
