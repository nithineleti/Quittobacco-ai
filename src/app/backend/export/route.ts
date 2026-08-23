import { requireAdmin } from "@/lib/auth/admin";
import { listAllUsers } from "@/lib/auth/db";

export const dynamic = "force-dynamic";

/**
 * Full export for backup or analysis.
 *
 * Contains every user's account details and quit journey, so it is gated by the
 * same operator check as the dashboard and marked no-store — this must never
 * sit in a CDN or browser cache. Password hashes are not included: `listAllUsers`
 * does not select the column.
 */
export async function GET() {
  await requireAdmin(); // 404s for non-operators

  const users = await listAllUsers();
  const body = JSON.stringify(
    { exportedAt: new Date().toISOString(), count: users.length, users },
    null,
    2,
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="quittobacco-export-${stamp}.json"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
