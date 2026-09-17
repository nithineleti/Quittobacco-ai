import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { summarizeJourney } from "@/lib/adminSummary";
import type { AdminUserRow, LoginEventRow } from "@/lib/auth/db";
import { formatPatientCode } from "@/lib/patient";

/**
 * Admin panel home: every patient, searchable, each linking to their own page
 * where the clinic sends them reports.
 *
 * Server-rendered with no client JavaScript — it is a read-only report plus a
 * plain GET search form, and the less code that touches this data the better.
 * Unlike the rest of the app this is desktop-first: it is an operator tool,
 * not a patient screen.
 */

const dtf = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dtfWithTime = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function when(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dtf.format(d);
}

export function whenExact(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dtfWithTime.format(d);
}

/**
 * A light, best-effort read of a user-agent string — not a real parser, just
 * enough for an operator to tell "a phone" from "a laptop" at a glance.
 */
function describeDevice(ua: string | null): string {
  if (!ua) return "—";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Macintosh/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "";
  return [browser, os].filter(Boolean).join(" · ") || "—";
}

function daysAgo(value: string | null): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-3xl font-bold tabular-nums text-fg">{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </Card>
  );
}

export function BackendDashboard({
  users,
  matches,
  query,
  viewerEmail,
  liveResetTokens,
  loginEvents,
  documents,
}: {
  /** Every patient — the stats are computed over all of them. */
  users: AdminUserRow[];
  /** The subset the search matched (all of them when there is no query). */
  matches: AdminUserRow[];
  query: string;
  viewerEmail: string;
  liveResetTokens: number;
  loginEvents: LoginEventRow[];
  documents: number;
}) {
  const now = new Date();
  const rows = users.map((u) => ({ user: u, j: summarizeJourney(u.state, now) }));
  const shown = matches.map((u) => ({ user: u, j: summarizeJourney(u.state, now) }));

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
  const rewards = rows.reduce((n, r) => n + r.j.rewardsClaimed, 0);
  const withPhone = rows.filter((r) => r.user.phone).length;
  const hindi = rows.filter((r) => r.user.language === "hi").length;
  const slipped7 = rows.filter((r) => recent(r.j.lastSlip, 7)).length;

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
          <h1 className="text-2xl font-bold tracking-tight text-fg">Patients</h1>
          <p className="text-sm text-muted">
            Every account, their quit journey, and what the clinic has sent them · signed in as {viewerEmail}
          </p>
        </div>
        <a
          href="/backend/export"
          className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-border bg-card px-4 text-sm font-semibold text-fg hover:bg-surface-2"
        >
          <Icon name="Download" className="size-4" />
          Download JSON
        </a>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Patients" value={total} />
        <Stat label="New" value={new7} hint="last 7 days" />
        <Stat label="Active" value={active7} hint="signed in, 7 days" />
        <Stat label="Reports sent" value={documents} hint="all patients" />
        <Stat label="Slipped" value={slipped7} hint="last 7 days" />
        <Stat label="Check-ins" value={checkIns} hint="all patients" />
        <Stat label="With journey" value={withJourney} hint={`${onboarded} onboarded`} />
        <Stat label="Rewards claimed" value={rewards} />
        <Stat label="Avg dependence" value={avgDependence} hint="Fagerström 0–10" />
        <Stat label="Gave a phone" value={withPhone} hint={`${total - withPhone} did not`} />
        <Stat label="Using Hindi" value={hindi} hint={`${total - hindi} English`} />
        <Stat label="Live reset links" value={liveResetTokens} hint="unused, unexpired" />
      </section>

      {/* Find a patient. A plain GET form: works with no JavaScript, and the
          URL carries the search so it can be bookmarked or shared between
          operators. */}
      <form action="/backend" method="get" className="flex flex-wrap items-center gap-2">
        <label htmlFor="q" className="sr-only">
          Find a patient
        </label>
        <div className="relative min-w-64 flex-1">
          <Icon name="Search" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Patient ID (QT-000042), name, e-mail or phone"
            autoComplete="off"
            className="min-h-12 w-full rounded-pill border border-border bg-card pl-12 pr-4 text-base text-fg placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="min-h-12 rounded-pill bg-primary px-5 text-sm font-semibold text-primary-fg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Search
        </button>
        {query && (
          <Link
            href="/backend"
            className="min-h-12 rounded-pill px-4 text-sm font-semibold leading-12 text-muted hover:text-fg"
          >
            Clear
          </Link>
        )}
      </form>

      {query && (
        <p className="text-sm text-muted">
          {shown.length === 0
            ? `No patient matches “${query}”.`
            : `${shown.length} of ${total} patients match “${query}”.`}
        </p>
      )}

      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-6xl border-collapse text-left text-sm">
            <thead className="border-b border-border bg-surface-2">
              <tr className="text-muted">
                {[
                  "Patient ID",
                  "Patient",
                  "Phone",
                  "Lang",
                  "Joined",
                  "Last login",
                  "Quit date",
                  "Days",
                  "Active",
                  "Check-ins",
                  "Slips",
                  "Rewards",
                  "Videos",
                  "FTND",
                  "Reports",
                  "",
                ].map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-3 py-8 text-center text-muted">
                    {query ? "No matching patients." : "No patients yet."}
                  </td>
                </tr>
              )}
              {shown.map(({ user: u, j }) => {
                const href = `/backend/patients/${u.id}`;
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
                    <td className="whitespace-nowrap px-3 py-2">
                      <Link href={href} className="font-mono font-semibold text-primary hover:underline">
                        {formatPatientCode(u.patient_no)}
                      </Link>
                    </td>
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
                    <td className="whitespace-nowrap px-3 py-2 text-muted">
                      {u.phone ?? "—"}
                      {u.phone && (
                        <span
                          className={u.phone_verified_at ? "ml-1 text-success" : "ml-1"}
                          title={u.phone_verified_at ? "verified" : "not verified"}
                        >
                          {u.phone_verified_at ? "✓" : "?"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 uppercase text-muted">{u.language}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted">{when(u.created_at)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted">{when(u.last_login_at)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted">{j.quitDate ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-fg">{j.daysSinceQuit ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-fg">{j.activeDays}</td>
                    <td className="px-3 py-2 tabular-nums text-fg">{j.checkIns}</td>
                    <td className="px-3 py-2 tabular-nums text-fg">{j.slips}</td>
                    <td className="px-3 py-2 tabular-nums text-fg">{j.rewardsClaimed}</td>
                    <td className="px-3 py-2 tabular-nums text-fg">{j.videosCompleted}</td>
                    <td className="px-3 py-2 tabular-nums text-fg">
                      {j.dependence ?? "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-fg">{u.documents}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Link
                        href={href}
                        className="inline-flex min-h-9 items-center gap-1 rounded-pill bg-primary-soft px-3 text-xs font-semibold text-primary hover:opacity-90"
                      >
                        Open
                        <Icon name="ChevronRight" className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted">
        Passwords are not listed because they are not stored. Each is a one-way
        scrypt hash with a per-user salt, so no plaintext password exists to
        display — to anyone, including an operator. A patient who forgets theirs
        uses “Forgot your password?”.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-fg">Login activity</h2>
        <p className="text-sm text-muted">
          Every sign-in and sign-up attempt, successful or not — the real,
          auditable answer to “see credentials in a dashboard”: not the
          password itself, which cannot exist here, but every time one was
          used.
        </p>
        <Card padded={false} className="overflow-hidden">
          <div className="max-h-128 overflow-y-auto overflow-x-auto">
            <table className="w-full min-w-4xl border-collapse text-left text-sm">
              <thead className="sticky top-0 border-b border-border bg-surface-2">
                <tr className="text-muted">
                  {["When", "Account", "Method", "Action", "Result", "Reason", "Device", "IP"].map(
                    (h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {loginEvents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted">
                      No login activity yet.
                    </td>
                  </tr>
                )}
                {loginEvents.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-muted">
                      {whenExact(e.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-fg">{e.display_name ?? "—"}</div>
                      <div className="text-xs text-muted">{e.email}</div>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {e.method === "google"
                        ? "Google"
                        : e.method === "otp"
                          ? "Mobile OTP"
                          : "Password"}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {e.action === "sign_up" ? "Sign up" : "Sign in"}
                    </td>
                    <td className="px-3 py-2">
                      <Pill tone={e.success ? "success" : "danger"}>
                        {e.success ? "OK" : "Failed"}
                      </Pill>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">{e.reason ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                      {describeDevice(e.user_agent)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                      {e.ip ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </main>
  );
}
