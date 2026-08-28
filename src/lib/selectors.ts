/**
 * Derived reads over the store. Components call these instead of doing domain
 * math inline (§9): the store holds source data, the pure libs compute meaning.
 */
import { addDays, daysBetween, parseLocalDate, toISODate } from "@/lib/format";
import {
  currentStreakDays,
  moneySaved,
  recoveryPercent,
  totalFreeDays,
} from "@/lib/health";
import {
  ladderWithStatus,
  nextReward,
  type RewardContext,
} from "@/lib/rewards";
import { currentBadge, type BadgeProgress, type BadgeTier } from "@/lib/scoring";
import type { Store } from "@/lib/store";

export function slipDates(s: Store): string[] {
  return s.slips.map((x) => x.date);
}

export function streakDays(s: Store, now: Date = new Date()): number {
  return s.quitDate ? currentStreakDays(s.quitDate, slipDates(s), now) : 0;
}

export function totalFreeDaysSel(s: Store, now: Date = new Date()): number {
  return s.quitDate ? totalFreeDays(s.quitDate, slipDates(s), now) : 0;
}

export function videosCompletedCount(s: Store): number {
  return Object.values(s.videos).filter((v) => v.status === "completed").length;
}

export function scansCompletedCount(s: Store): number {
  return s.scans.length;
}

export function scanDayIndices(s: Store): number[] {
  return s.scans.map((x) => x.dayIndex);
}

export function distinctCheckInDays(s: Store): number {
  return new Set(s.checkIns.map((c) => c.date)).size;
}

export function badgeProgress(s: Store, now: Date = new Date()): BadgeProgress {
  return {
    daysFree: streakDays(s, now),
    scansCompleted: scansCompletedCount(s),
    videosCompleted: videosCompletedCount(s),
  };
}

export function badgeInfo(
  s: Store,
  now: Date = new Date(),
): { tier: BadgeTier; next: ReturnType<typeof currentBadge>["next"] } {
  const starting = s.intake?.startingTier ?? "bronze";
  return currentBadge(starting, badgeProgress(s, now));
}

/**
 * Days the user actually showed up for, counted from the start of the current
 * streak (the quit date, or the day after the most recent slip).
 *
 * This — not elapsed calendar time — is what earns rewards. Time alone would
 * let someone set a quit date three months back at sign-up and unlock the whole
 * ladder without ever opening the app again.
 */
export function activeDaysSinceQuit(s: Store, now: Date = new Date()): number {
  if (!s.quitDate) return 0;

  const past = slipDates(s).filter((d) => daysBetween(d, now) >= 0);
  const lastSlip = past.sort().at(-1);
  // A slip restarts the count from the following day.
  const start = lastSlip ? addDays(lastSlip, 1) : parseLocalDate(s.quitDate);
  const startISO = toISODate(start);
  const todayISO = toISODate(now);

  return new Set(
    s.loginDays.filter((d) => d >= startISO && d <= todayISO),
  ).size;
}

export function rewardContext(s: Store, now: Date = new Date()): RewardContext {
  return {
    // Deliberately the ACTIVE-day count, not streakDays. The recovery timeline
    // still uses real elapsed time — nicotine leaves the body on its own
    // schedule — but a reward has to be turned up for.
    streakDays: activeDaysSinceQuit(s, now),
    totalCheckIns: distinctCheckInDays(s),
    scanDays: scanDayIndices(s),
    claimedIds: Object.keys(s.claimed),
  };
}

export function rewardLadder(s: Store, now: Date = new Date()) {
  return ladderWithStatus(rewardContext(s, now));
}

export function nextRewardSel(s: Store, now: Date = new Date()) {
  return nextReward(rewardContext(s, now));
}

export function moneySavedTotal(s: Store, now: Date = new Date()): number {
  return moneySaved(s.intakeAnswers?.perDaySpend ?? 0, totalFreeDaysSel(s, now));
}

export function recovery(s: Store, now: Date = new Date()): number {
  return recoveryPercent(totalFreeDaysSel(s, now));
}

export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA").format(now); // YYYY-MM-DD local
}

export function checkedInToday(s: Store, now: Date = new Date()): boolean {
  const today = todayISO(now);
  return s.checkIns.some((c) => c.date === today);
}
