import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { summarizeJourney } from "@/lib/adminSummary";
import type { AdminUserRow } from "@/lib/auth/db";

/**
 * Operator dashboard: every account and every synced journey.
 *
 * Server-rendered with no client JavaScript — it is a read-only report, and the
 * less code that touches this data the better. Unlike the rest of the app this
 * is desktop-first: it is an operator tool, not a patient screen.
 */

const dtf = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function when(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dtf.format(d);
}

function daysAgo(value: string | null): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-3xl font-semibold tabular-nums text-fg">{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </Card>
  );
}

export function BackendDashboard({
  users,
  viewerEmail,
  liveResetTokens,
}: {
  users: AdminUserRow[];
  viewerEmail: string;
  liveResetTokens: number;
}) {
  const now = new Date();
  const rows = users.map((u) => ({ user: u, j: summarizeJourney(u.state, now) }));

  const recent = (v: string | null, days: number) => {
    const d = daysAgo(v);
    return d !== null && d <= days;
  };

  const total = rows.length;
  const new7 = rows.filter((r) => recent(r.user.created_at, 7)).length;
  const active7 = rows.filter((r) => recent(r.user.last_login_at, 7)).length;
  const withJourney = rows.filter((r) => r.j.hasJourney).length;
  const onboarded = rows.filter((r) => r.j.onboarded).length;
  const checkIns = rows.reduce((n, r) => n + r.j.checkIns, 0);
  const scans = rows.reduce((n, r) => n + r.j.scans, 0);
  const rewards = rows.reduce((n, r) => n + r.j.rewardsClaimed, 0);
  const withPhone = rows.filter((r) => r.user.phone).length;
  const hindi = rows.filter((r) => r.user.language === "hi").length;

  const dependences = rows
    .map((r) => r.j.dependence)
    .filter((d): d is number => d !== null);
  const avgDependence = dependences.length
    ? (dependences.reduce((a, b) => a + b, 0) / dependences.length).toFixed(1)
    : "—";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">Backend dashboard</h1>
          <p className="text-sm text-muted">
            Every account and synced journey · signed in as {viewerEmail}
          </p>
        </div>
        <a
          href="/backend/export"
          className="min-h-11 rounded-pill border border-border bg-card px-4 text-sm font-semibold leading-[2.75rem] text-fg hover:bg-surface-2"
        >
          Download JSON
        </a>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Accounts" value={total} />
        <Stat label="New" value={new7} hint="last 7 days" />
        <Stat label="Active" value={active7} hint="signed in, 7 days" />
        <Stat label="With journey" value={withJourney} hint={`${onboarded} onboarded`} />
        <Stat label="Check-ins" value={checkIns} hint="all users" />
        <Stat label="Oral scans" value={scans} />
        <Stat label="Rewards claimed" value={rewards} />
        <Stat label="Avg dependence" value={avgDependence} hint="Fagerström 0–10" />
        <Stat label="Gave a phone" value={withPhone} hint={`${total - withPhone} did not`} />
        <Stat label="Using Hindi" value={hindi} hint={`${total - hindi} English`} />
        <Stat label="Live reset links" value={liveResetTokens} hint="unused, unexpired" />
      </section>

      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
            <thead className="border-b border-border bg-surface-2">
              <tr className="text-muted">
                {[
                  "Account",
                  "Phone",
                  "Lang",
                  "Joined",
                  "Last login",
                  "Quit date",
                  "Days",
                  "Check-ins",
                  "Slips",
                  "Scans",
                  "Rewards",
                  "Videos",
                  "FTND",
                  "Synced",
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-3 py-8 text-center text-muted">
                    No accounts yet.
                  </td>
                </tr>
              )}
              {rows.map(({ user: u, j }) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-fg">
                        {u.display_name ?? "—"}
                      </span>
                      {u.is_admin && <Pill tone="neutral">admin</Pill>}
                      {!j.hasJourney && <Pill tone="neutral">no data</Pill>}
                    </div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{u.phone ?? "—"}</td>
                  <td className="px-3 py-2 uppercase text-muted">{u.language}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{when(u.created_at)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{when(u.last_login_at)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{j.quitDate ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums text-fg">{j.daysSinceQuit ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums text-fg">{j.checkIns}</td>
                  <td className="px-3 py-2 tabular-nums text-fg">{j.slips}</td>
                  <td className="px-3 py-2 tabular-nums text-fg">{j.scans}</td>
                  <td className="px-3 py-2 tabular-nums text-fg">{j.rewardsClaimed}</td>
                  <td className="px-3 py-2 tabular-nums text-fg">{j.videosCompleted}</td>
                  <td className="px-3 py-2 tabular-nums text-fg">
                    {j.dependence ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">{when(u.synced_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted">
        Passwords are not listed because they are not stored. Each is a one-way
        scrypt hash with a per-user salt, so no plaintext password exists to
        display — to anyone, including an operator. A user who forgets theirs
        uses “Forgot your password?”. Scan photos stay on the patient&apos;s
        device and never reach the server.
      </p>
    </main>
  );
}
