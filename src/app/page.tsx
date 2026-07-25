"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/Brand";
import { useHydrated, useStore } from "@/lib/store";

// Entry point. Routes by REAL persisted state — no fake splash timer (§11).
export default function Home() {
  const router = useRouter();
  const hydrated = useHydrated();
  const hasOnboarded = useStore((s) => s.hasOnboarded);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(hasOnboarded ? "/dashboard" : "/onboarding");
  }, [hydrated, hasOnboarded, router]);

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="flex flex-col items-center gap-4">
        <Brand />
        <p className="text-sm text-muted">Loading your journey…</p>
      </div>
    </main>
  );
}
