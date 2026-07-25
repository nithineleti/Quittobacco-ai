/**
 * PURE health math — no React, no store. Unit-tested.
 *
 * Streak handles slips compassionately (§8): a slip resets the *current* run
 * but never erases total tobacco-free days across the whole journey, and never
 * touches already-earned rewards.
 */
import { addDays, daysBetween, parseLocalDate } from "@/lib/format";

export interface Slip {
  /** ISO date (YYYY-MM-DD) of the lapse. */
  date: string;
  triggerId?: string;
  note?: string;
}

/**
 * Current run: tobacco-free days since the most recent slip (or since quitting
 * if there have been no slips). A slip today yields a streak of 0.
 */
export function currentStreakDays(
  quitDate: string,
  slipDates: string[],
  now: Date = new Date(),
): number {
  const past = slipDates.filter((d) => daysBetween(d, now) >= 0);
  const lastSlip = past.sort().at(-1);
  const start = lastSlip ? addDays(lastSlip, 1) : parseLocalDate(quitDate);
  return Math.max(0, daysBetween(start, now));
}

/**
 * Total tobacco-free days across the whole journey — elapsed days minus the
 * days on which a slip was logged. This is the number we celebrate.
 */
export function totalFreeDays(
  quitDate: string,
  slipDates: string[],
  now: Date = new Date(),
): number {
  const elapsed = daysBetween(quitDate, now);
  const slipsInRange = slipDates.filter(
    (d) => daysBetween(quitDate, d) >= 0 && daysBetween(d, now) >= 0,
  ).length;
  return Math.max(0, elapsed - slipsInRange);
}

export function moneySaved(perDaySpend: number, freeDays: number): number {
  return Math.max(0, perDaySpend) * Math.max(0, freeDays);
}

export function savingsGoalPercent(saved: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((saved / goal) * 100)));
}

/**
 * A motivational "recovery journey" indicator (0–100) that rises fast early and
 * plateaus — matching how the body heals most quickly in the first weeks. This
 * is a progress indicator, NOT a medical measurement; the cited milestone
 * timeline (src/data/recovery.ts) carries the actual health claims.
 */
export function recoveryPercent(freeDays: number): number {
  if (freeDays <= 0) return 0;
  return Math.round(Math.min(100, 100 * (1 - Math.exp(-freeDays / 140))));
}

/**
 * Relatable comparison for money saved (India tier-2 context). Returns a stable
 * id the UI localises via i18n (dashboard.tangible.<id>) — not display text.
 */
const TANGIBLE: Array<{ min: number; id: string }> = [
  { min: 20000, id: "smartphone" },
  { min: 8000, id: "rent" },
  { min: 4000, id: "groceries" },
  { min: 1500, id: "vegetables" },
  { min: 500, id: "movie" },
  { min: 150, id: "meal" },
  { min: 0, id: "chai" },
];

export function tangibleSavings(amount: number): string {
  for (const t of TANGIBLE) if (amount >= t.min) return t.id;
  return TANGIBLE[TANGIBLE.length - 1].id;
}

// ---- Recovery timeline -----------------------------------------------------

export interface RecoveryMilestone {
  /** Days after quitting when this benefit is reached. */
  day: number;
  label: string;
  benefit: string;
  /** Cited source URL (WHO/CDC). */
  source: string;
}

export function reachedMilestones<T extends RecoveryMilestone>(
  freeDays: number,
  milestones: T[],
): Array<T & { reached: boolean }> {
  return milestones.map((m) => ({ ...m, reached: freeDays >= m.day }));
}

export function nextMilestone<T extends RecoveryMilestone>(
  freeDays: number,
  milestones: T[],
): (T & { daysRemaining: number }) | null {
  const upcoming = [...milestones]
    .sort((a, b) => a.day - b.day)
    .find((m) => m.day > freeDays);
  return upcoming ? { ...upcoming, daysRemaining: upcoming.day - freeDays } : null;
}

// ---- Trigger insights ------------------------------------------------------

export interface CheckIn {
  date: string;
  /** Hour of day 0–23 the check-in/craving was logged. */
  hour: number;
  /** Craving intensity 0 (none) – 4 (severe). */
  cravingLevel: number;
  usedToday: boolean;
  mood?: string;
  triggerId?: string;
}

export interface TriggerInsight {
  /** e.g. "4–6 pm" */
  window: string;
  windowStartHour: number;
  topTriggerId?: string;
  sampleSize: number;
}

function formatHourRange(startHour: number, endHour: number): string {
  const fmt = (h: number) => {
    const hour = ((h % 24) + 24) % 24;
    const period = hour < 12 ? "am" : "pm";
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return { h12, period };
  };
  const a = fmt(startHour);
  const b = fmt(endHour);
  return a.period === b.period
    ? `${a.h12}–${b.h12} ${b.period}`
    : `${a.h12} ${a.period}–${b.h12} ${b.period}`;
}

/**
 * After enough check-ins, surface the 2-hour window when strong cravings cluster
 * and the most common logged trigger. Returns null until minSample is met.
 */
export function computeTriggerInsight(
  checkIns: CheckIn[],
  minSample = 7,
): TriggerInsight | null {
  if (checkIns.length < minSample) return null;

  const strong = checkIns.filter((c) => c.cravingLevel >= 3);
  const sample = strong.length > 0 ? strong : checkIns;

  const buckets = new Array(12).fill(0);
  for (const c of sample) buckets[Math.floor((((c.hour % 24) + 24) % 24) / 2)]++;
  let bucket = 0;
  for (let i = 1; i < buckets.length; i++) if (buckets[i] > buckets[bucket]) bucket = i;
  const windowStartHour = bucket * 2;

  const counts = new Map<string, number>();
  for (const c of sample) {
    if (c.triggerId) counts.set(c.triggerId, (counts.get(c.triggerId) ?? 0) + 1);
  }
  let topTriggerId: string | undefined;
  let topCount = 0;
  for (const [id, n] of counts) {
    if (n > topCount) {
      topCount = n;
      topTriggerId = id;
    }
  }

  return {
    window: formatHourRange(windowStartHour, windowStartHour + 2),
    windowStartHour,
    topTriggerId,
    sampleSize: sample.length,
  };
}
