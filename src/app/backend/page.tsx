import type { Metadata } from "next";
import { BackendDashboard } from "@/components/feature/BackendDashboard";
import { requireAdmin } from "@/lib/auth/admin";
import { countAuthTokens, listAllUsers } from "@/lib/auth/db";

export const metadata: Metadata = {
  title: "Backend dashboard",
  robots: { index: false, follow: false },
};

// Every request re-reads the database; nothing here may ever be cached.
export const dynamic = "force-dynamic";

export default async function BackendPage() {
  // 404s for anyone who isn't an operator, before a single row is read.
  const admin = await requireAdmin();

  const [users, liveResetTokens] = await Promise.all([
    listAllUsers(),
    countAuthTokens(),
  ]);

  return (
    <BackendDashboard
      users={users}
      viewerEmail={admin.email}
      liveResetTokens={liveResetTokens}
    />
  );
}
