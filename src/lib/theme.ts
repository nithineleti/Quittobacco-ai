"use client";

import { useSyncExternalStore } from "react";

/**
 * Theme preference. "system" follows the phone; "light"/"dark" pin it.
 *
 * Kept OUTSIDE the zustand store on purpose: the store is wiped on sign-out
 * and replaced on sync, and a theme is a property of this phone and its
 * owner's eyes, not of the account. localStorage under its own key, read by
 * the inline no-flash script in app/layout.tsx before first paint.
 */
export type ThemePref = "light" | "dark" | "system";

export const THEME_KEY = "qt-theme";

const listeners = new Set<() => void>();

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** Applies the preference to <html> exactly the way the no-flash script does. */
export function applyTheme(pref: ThemePref): void {
  const dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const el = document.documentElement;
  el.classList.toggle("dark", dark);
  el.style.colorScheme = dark ? "dark" : "light";
}

export function setThemePref(pref: ThemePref): void {
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    // Private mode — still apply for this page view.
  }
  applyTheme(pref);
  for (const l of listeners) l();
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readThemePref,
    () => "system" as const,
  );
}
