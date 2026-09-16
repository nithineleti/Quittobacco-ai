import type { Metadata } from "next";
import { StateSync } from "@/components/StateSync";
import { OnboardingFlow } from "@/components/feature/OnboardingFlow";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ retake?: string }>;
}) {
  // Server-side gate, so access never depends on the proxy running.
  await verifySession();
  const { retake } = await searchParams;
  return (
    <>
      {/* Outside the (app) group, so it needs its own sync mount. */}
      <StateSync />
      <OnboardingFlow retake={retake === "1"} />
    </>
  );
}
