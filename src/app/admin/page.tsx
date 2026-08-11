import type { Metadata } from "next";
import { AdminScreen } from "@/components/feature/AdminScreen";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Clinician view" };

// Outside the (app) group: no bottom nav, no gamification (§9, §11).
export default async function AdminPage() {
  // Server-side gate, so access never depends on the proxy running.
  await verifySession();
  return <AdminScreen />;
}
