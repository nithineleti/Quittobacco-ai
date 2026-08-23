import type { Metadata } from "next";
import { StateSync } from "@/components/StateSync";
import { OnboardingFlow } from "@/components/feature/OnboardingFlow";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  // Server-side gate, so access never depends on the proxy running.
  await verifySession();
  return (
    <>
      {/* Outside the (app) group, so it needs its own sync mount. */}
      <StateSync />
      <OnboardingFlow />
    </>
  );
}
