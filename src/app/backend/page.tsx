import type { Metadata } from "next";
import { BackendDashboard } from "@/components/feature/BackendDashboard";
import { requireAdmin } from "@/lib/auth/admin";
import {
  countAllDocuments,
  countAuthTokens,
  listAllUsers,
  listLoginEvents,
} from "@/lib/auth/db";
import { matchesPatientQuery } from "@/lib/patient";

export const metadata: Metadata = {
  title: "Admin panel",
  robots: { index: false, follow: false },
};

// Every request re-reads the database; nothing here may ever be cached.
export const dynamic = "force-dynamic";

export default async function BackendPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // 404s for anyone who isn't an operator, before a single row is read.
  const admin = await requireAdmin();
  const { q = "" } = await searchParams;

  const [users, liveResetTokens, loginEvents, documents] = await Promise.all([
    listAllUsers(),
    countAuthTokens(),
    listLoginEvents(),
    countAllDocuments(),
  ]);

  // Filtered in memory: the page already holds every row for the stats, and
  // a clinic's patient list is thousands at most, not millions.
  const query = q.trim().slice(0, 80);
  const matches = query ? users.filter((u) => matchesPatientQuery(u, query)) : users;

  return (
    <BackendDashboard
      users={users}
      matches={matches}
      query={query}
      viewerEmail={admin.email}
      liveResetTokens={liveResetTokens}
      loginEvents={loginEvents}
      documents={documents}
    />
  );
}
