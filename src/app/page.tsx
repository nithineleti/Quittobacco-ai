"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/Brand";
import { StateSync } from "@/components/StateSync";
import { useHydrated, useStore } from "@/lib/store";
import { useSyncStatus } from "@/lib/sync";

// Entry point. Routes by REAL persisted state — no fake splash timer (§11).
export default function Home() {
  const router = useRouter();
  const hydrated = useHydrated();
  const syncStatus = useSyncStatus();
  const hasOnboarded = useStore((s) => s.hasOnboarded);

  useEffect(() => {
    // Wait for the account restore as well as local hydration. Deciding early
    // would send someone signing in on a NEW phone through onboarding again,
    // moments before their real journey arrives from the server.
    if (!hydrated || syncStatus !== "done") return;

    // Demo mode: send every sign-in through the questionnaire, so each run
    // shows the whole journey from the start. Off by default — a real user
    // returning to a 40-day streak must land on their dashboard, not be asked
    // the twelve intake questions again.
    const alwaysOnboard = process.env.NEXT_PUBLIC_ALWAYS_ONBOARD === "1";
    router.replace(alwaysOnboard || !hasOnboarded ? "/onboarding" : "/dashboard");
  }, [hydrated, syncStatus, hasOnboarded, router]);

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <StateSync />
      <div className="flex flex-col items-center gap-4">
        <Brand />
        <p className="text-sm text-muted">Loading your journey…</p>
      </div>
    </main>
  );
}
