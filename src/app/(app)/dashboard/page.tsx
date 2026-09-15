import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardScreen } from "@/components/feature/DashboardScreen";
import { getCurrentUser } from "@/lib/auth/dal";
import { countUnseenDocuments } from "@/lib/auth/db";

export const metadata: Metadata = { title: "Home" };

export default async function DashboardPage() {
  // The one server-side fact the dashboard shows: whether the clinic has sent
  // something this patient hasn't opened yet. Everything else is device state.
  const user = await getCurrentUser();
  const unreadReports = await countUnseenDocuments(user.id);

  return (
    <Suspense fallback={null}>
      <DashboardScreen unreadReports={unreadReports} />
    </Suspense>
  );
}
