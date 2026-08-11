import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/feature/OnboardingFlow";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  // Server-side gate, so access never depends on the proxy running.
  await verifySession();
  return <OnboardingFlow />;
}
