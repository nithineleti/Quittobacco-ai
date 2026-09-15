/**
 * PURE reward-ladder logic — no React, no store. Unit-tested.
 *
 * Integrity (§3.6): high-value REAL rewards can't be unlocked by a self-reported
 * streak alone. They additionally require a consistent check-in history — a
 * person who has genuinely stayed off tobacco for 90 days has shown up in the
 * app for most of them. The clinic then verifies in person: the admin panel
 * shows every patient's journey, and a real reward is handed over at the
 * clinic, never posted. Digital rewards stay self-reported.
 */
import type { BadgeTier } from "@/lib/scoring";

export type RewardKind = "digital" | "real";

export interface RewardRung {
  id: string;
  /** Streak days required to reach this rung. */
  day: number;
  title: string;
  detail: string;
  kind: RewardKind;
  /** lucide icon name, chosen at render. */
  icon: string;
  /** If this rung also confers a badge tier. */
  badgeTier?: BadgeTier;
  /** Real-reward gate: minimum lifetime daily check-ins. */
  minCheckIns?: number;
}

/**
 * The approved ladder (Day 1 → Day 365). Day-15 dental visit and Day-90 kit are
 * the user-specified anchors; the rest fill in around them.
 */
export const REWARD_LADDER: RewardRung[] = [
  {
    id: "day1",
    day: 1,
    title: "First day free",
    detail: "You made it through day one. This is the hardest step.",
    kind: "digital",
    icon: "Sunrise",
  },
  {
    id: "day3",
    day: 3,
    title: "72 hours",
    detail: "Nicotine is leaving your body. Cravings start to ease from here.",
    kind: "digital",
    icon: "Wind",
  },
  {
    id: "day7",
    day: 7,
    title: "One week free — certificate",
    detail: "A shareable certificate for your first tobacco-free week.",
    kind: "digital",
    icon: "Award",
  },
  {
    id: "day15",
    day: 15,
    title: "Free dental check-up",
    detail: "A free oral-health check-up at a partner clinic.",
    kind: "real",
    icon: "Stethoscope",
    minCheckIns: 10,
  },
  {
    id: "day30",
    day: 30,
    title: "Oral-care voucher + Gold",
    detail: "A voucher toward oral-care products, and your Gold tier.",
    kind: "real",
    icon: "Ticket",
    badgeTier: "gold",
    minCheckIns: 20,
  },
  {
    id: "day90",
    day: 90,
    title: "Free toothpaste + toothbrush kit",
    detail: "A free oral-care kit from a partner brand.",
    kind: "real",
    icon: "Gift",
    minCheckIns: 60,
  },
  {
    id: "day180",
    day: 180,
    title: "Free dental cleaning + Platinum",
    detail: "A professional scaling & cleaning, and your Platinum tier.",
    kind: "real",
    icon: "Sparkles",
    badgeTier: "platinum",
    minCheckIns: 120,
  },
  {
    id: "day365",
    day: 365,
    title: "Comprehensive dental exam + Diamond",
    detail: "A full dental exam, your Diamond tier, and a 1-year certificate.",
    kind: "real",
    icon: "Trophy",
    badgeTier: "diamond",
    minCheckIns: 240,
  },
];

export type RewardState = "claimed" | "claimable" | "needs-evidence" | "locked";

export interface RewardContext {
  /** Current streak (consecutive tobacco-free days). */
  streakDays: number;
  /** Lifetime completed daily check-ins. */
  totalCheckIns: number;
  /** Ids already claimed — claimed rewards are permanent, even after a slip. */
  claimedIds: string[];
}

export interface RewardStatus {
  id: string;
  state: RewardState;
  /** Days of streak still needed (when locked). */
  daysRemaining?: number;
  /** Human-readable evidence still required (when needs-evidence). */
  missing?: string[];
}

export function rewardStatus(rung: RewardRung, ctx: RewardContext): RewardStatus {
  if (ctx.claimedIds.includes(rung.id)) return { id: rung.id, state: "claimed" };

  if (ctx.streakDays < rung.day) {
    return { id: rung.id, state: "locked", daysRemaining: rung.day - ctx.streakDays };
  }

  if (rung.kind === "digital") return { id: rung.id, state: "claimable" };

  // Real reward — check the evidence.
  const missing: string[] = [];
  if (rung.minCheckIns != null && ctx.totalCheckIns < rung.minCheckIns) {
    missing.push(`${rung.minCheckIns - ctx.totalCheckIns} more daily check-ins`);
  }
  if (missing.length > 0) return { id: rung.id, state: "needs-evidence", missing };
  return { id: rung.id, state: "claimable" };
}

export function ladderWithStatus(
  ctx: RewardContext,
): Array<{ rung: RewardRung; status: RewardStatus }> {
  return REWARD_LADDER.map((rung) => ({ rung, status: rewardStatus(rung, ctx) }));
}

/** The next reward to chase — the nearest rung that isn't claimed yet. */
export function nextReward(
  ctx: RewardContext,
): { rung: RewardRung; status: RewardStatus } | null {
  for (const rung of REWARD_LADDER) {
    const status = rewardStatus(rung, ctx);
    if (status.state !== "claimed") return { rung, status };
  }
  return null;
}
