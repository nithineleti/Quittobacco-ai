"use client";

import { useEffect } from "react";
import { useHydrated } from "@/lib/store";
import { useStore } from "@/lib/store";
import { ensureSync, flushPush, schedulePush } from "@/lib/sync";

/**
 * Drives the sync module: kicks off the first restore and pushes later changes.
 *
 * Mounted on every signed-in surface — including `/` and `/onboarding`, which
 * sit outside the (app) route group. A device that has just signed in lands on
 * one of those first, so mounting only inside (app) meant the journey was never
 * restored at all.
 */
export function StateSync() {
  const hydrated = useHydrated();

  useEffect(() => {
    // Wait for localStorage to rehydrate first, or we'd push an empty journey
    // over a good server copy on every cold load.
    if (!hydrated) return;

    // Mark today as a day the user actually showed up. Idempotent per date, and
    // it runs after the restore so a day recorded on another device isn't
    // double-counted. This is what earns rewards — see activeDaysSinceQuit.
    void ensureSync().then(() => useStore.getState().recordLoginDay());

    const unsubscribe = useStore.subscribe(schedulePush);

    document.addEventListener("visibilitychange", flushPush);
    window.addEventListener("pagehide", flushPush);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", flushPush);
      window.removeEventListener("pagehide", flushPush);
    };
  }, [hydrated]);

  return null;
}
