import type { Metadata } from "next";
import { AdminScreen } from "@/components/feature/AdminScreen";

export const metadata: Metadata = { title: "Clinician view" };

// Outside the (app) group: no bottom nav, no gamification (§9, §11).
export default function AdminPage() {
  return <AdminScreen />;
}
