/**
 * Derives dashboard figures from a user's synced journey document.
 *
 * Tolerant by design: the JSONB is whatever a client wrote, possibly from an
 * older app version, so every field is treated as untrusted and optional. One
 * malformed row must not take the whole dashboard down.
 */

export interface JourneySummary {
  hasJourney: boolean;
  onboarded: boolean;
  quitDate: string | null;
  checkIns: number;
  slips: number;
  rewardsClaimed: number;
  videosCompleted: number;
  /** Fagerström score, 0–10. */
  dependence: number | null;
  readiness: number | null;
  savingsGoal: number | null;
  /** Whole days from quit date to today, ignoring slips. */
  daysSinceQuit: number | null;
  /** Distinct days the app was opened since the quit date. */
  activeDays: number;
  /** ISO date of the most recent slip, if any. */
  lastSlip: string | null;
}

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function summarizeJourney(
  state: unknown,
  now: Date = new Date(),
): JourneySummary {
  const s = obj(state);
  const empty = Object.keys(s).length === 0;
  const intake = obj(s.intake);
  const quitDate = str(s.quitDate);

  let daysSinceQuit: number | null = null;
  if (quitDate) {
    const started = new Date(`${quitDate}T00:00:00`);
    if (!Number.isNaN(started.getTime())) {
      daysSinceQuit = Math.max(
        0,
        Math.floor((now.getTime() - started.getTime()) / 86_400_000),
      );
    }
  }

  const videos = obj(s.videos);
  const videosCompleted = Object.values(videos).filter(
    (v) => obj(v).status === "completed",
  ).length;

  const loginDays = arr(s.loginDays).filter(
    (d): d is string => typeof d === "string" && (!quitDate || d >= quitDate),
  );

  const slipDates = arr(s.slips)
    .map((x) => str(obj(x).date))
    .filter((d): d is string => d !== null)
    .sort();

  return {
    hasJourney: !empty,
    onboarded: s.hasOnboarded === true,
    quitDate,
    checkIns: arr(s.checkIns).length,
    slips: slipDates.length,
    rewardsClaimed: Object.keys(obj(s.claimed)).length,
    videosCompleted,
    dependence: num(intake.ftnd),
    readiness: num(intake.readiness),
    savingsGoal: num(s.savingsGoal),
    daysSinceQuit,
    activeDays: new Set(loginDays).size,
    lastSlip: slipDates.at(-1) ?? null,
  };
}
