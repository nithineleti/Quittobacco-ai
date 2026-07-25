/**
 * PURE domain logic — no React, no store. Unit-tested.
 *
 * Nicotine-dependence scoring uses the published Fagerström instruments:
 *
 *  - Smoked tobacco: Fagerström Test for Nicotine Dependence (FTND).
 *    Heatherton TF, Kozlowski LT, Frecker RC, Fagerström KO (1991).
 *    6 items, total 0–10. Bands: 0–2 very low, 3–4 low, 5 moderate,
 *    6–7 high, 8–10 very high.
 *    Ref: https://cde.nlm.nih.gov/formView?tinyId=myLzkabPx
 *
 *  - Smokeless tobacco: Fagerström Test for Nicotine Dependence-Smokeless
 *    Tobacco (FTND-ST). Ebbert JO, Patten CA, Schroeder DR (2006),
 *    Addict Behav. 6 items, total 0–10; ≥5 indicates significant dependence.
 *    Ref: https://www.sciencedirect.com/science/article/abs/pii/S0306460305003084
 *
 * We keep the item point values exactly as published and only choose the
 * 5-band display (shared across both instruments, since both score 0–10).
 */

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";
export const BADGE_TIERS: BadgeTier[] = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
];

export type TobaccoForm = "smoked" | "smokeless";
export type TimeToFirst = "within5" | "6to30" | "31to60" | "after60";
export type SwallowJuice = "never" | "sometimes" | "always";

/** Discriminated FTND input — one shape per instrument. */
export type FtndInput =
  | {
      form: "smoked";
      timeToFirst: TimeToFirst;
      /** Hard to refrain from tobacco where it's forbidden? */
      difficultRefraining: boolean;
      /** Would hate most to give up the first use of the day? */
      hateToGiveUpFirst: boolean;
      /** Cigarettes/bidis per day. */
      perDay: number;
      /** Use more in the first hours after waking? */
      moreInMorning: boolean;
      /** Use even when ill in bed most of the day? */
      useWhenIll: boolean;
    }
  | {
      form: "smokeless";
      timeToFirst: TimeToFirst;
      /** How often tobacco juice is intentionally swallowed. */
      swallowJuice: SwallowJuice;
      hateToGiveUpFirst: boolean;
      /** Cans/pouches per week. */
      cansPerWeek: number;
      moreInMorning: boolean;
      useWhenIll: boolean;
    };

function timeToFirstPoints(t: TimeToFirst): number {
  switch (t) {
    case "within5":
      return 3;
    case "6to30":
      return 2;
    case "31to60":
      return 1;
    case "after60":
      return 0;
  }
}

/** FTND / FTND-ST total, 0–10, using the published item weights. */
export function scoreFtnd(input: FtndInput): number {
  let score = timeToFirstPoints(input.timeToFirst);
  score += input.hateToGiveUpFirst ? 1 : 0;
  score += input.moreInMorning ? 1 : 0;
  score += input.useWhenIll ? 1 : 0;

  if (input.form === "smoked") {
    score += input.difficultRefraining ? 1 : 0;
    // Cigarettes per day: ≤10=0, 11–20=1, 21–30=2, ≥31=3.
    if (input.perDay >= 31) score += 3;
    else if (input.perDay >= 21) score += 2;
    else if (input.perDay >= 11) score += 1;
  } else {
    // Swallow juice: never=0, sometimes=1, always=2.
    score += input.swallowJuice === "always" ? 2 : input.swallowJuice === "sometimes" ? 1 : 0;
    // Cans/pouches per week: ≤1=0, 2–3=1, >3=2.
    if (input.cansPerWeek > 3) score += 2;
    else if (input.cansPerWeek >= 2) score += 1;
  }
  return score;
}

export type DependenceLevel =
  | "very-low"
  | "low"
  | "moderate"
  | "high"
  | "very-high";

export interface DependenceBand {
  level: DependenceLevel;
  label: string;
  score: number;
}

/** Standard FTND interpretation bands (applied to both instruments, 0–10). */
export function dependenceBand(score: number): DependenceBand {
  let level: DependenceLevel;
  let label: string;
  if (score <= 2) [level, label] = ["very-low", "Very low dependence"];
  else if (score <= 4) [level, label] = ["low", "Low dependence"];
  else if (score === 5) [level, label] = ["moderate", "Moderate dependence"];
  else if (score <= 7) [level, label] = ["high", "High dependence"];
  else [level, label] = ["very-high", "Very high dependence"];
  return { level, label, score };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Readiness to change. Motivation is a 0–10 "readiness ruler" (Prochaska &
 * DiClemente Transtheoretical Model). We surface a 0–100 readiness and a
 * stage label. Ref: WHO cessation guidance; TTM stages of change.
 */
export type StageOfChange = "contemplation" | "preparation" | "action";

export function readinessScore(motivation: number): number {
  return Math.round(clamp(motivation, 0, 10) * 10);
}

export function stageOfChange(motivation: number): StageOfChange {
  const m = clamp(motivation, 0, 10);
  if (m <= 3) return "contemplation";
  if (m >= 8) return "action";
  return "preparation";
}

export function stageLabel(stage: StageOfChange): string {
  switch (stage) {
    case "contemplation":
      return "Thinking about quitting";
    case "preparation":
      return "Getting ready to quit";
    case "action":
      return "Ready to quit now";
  }
}

// ---- Badge tiers -----------------------------------------------------------

export function tierIndex(tier: BadgeTier): number {
  return BADGE_TIERS.indexOf(tier);
}

export function maxTier(a: BadgeTier, b: BadgeTier): BadgeTier {
  return tierIndex(a) >= tierIndex(b) ? a : b;
}

/**
 * Starting tier from the intake form (§3.1): higher motivation and lower
 * dependence start higher. Capped at Gold so there's always room to earn
 * Platinum and Diamond through real progress.
 */
export function startingBadgeTier(readiness: number, ftnd: number): BadgeTier {
  const score = clamp(readiness, 0, 100) - clamp(ftnd, 0, 10) * 6;
  if (score >= 45) return "gold";
  if (score >= 20) return "silver";
  return "bronze";
}

export interface BadgeProgress {
  daysFree: number;
  scansCompleted: number;
  videosCompleted: number;
}

interface TierRequirement {
  tier: BadgeTier;
  days: number;
  scans: number;
  videos: number;
}

/** Requirements to reach each tier through real activity (§3.1). */
export const TIER_REQUIREMENTS: TierRequirement[] = [
  { tier: "bronze", days: 1, scans: 0, videos: 0 },
  { tier: "silver", days: 7, scans: 1, videos: 2 },
  { tier: "gold", days: 30, scans: 2, videos: 4 },
  { tier: "platinum", days: 180, scans: 4, videos: 6 },
  { tier: "diamond", days: 365, scans: 8, videos: 8 },
];

function tierFromProgress(p: BadgeProgress): BadgeTier {
  let earned: BadgeTier = "bronze";
  let any = false;
  for (const r of TIER_REQUIREMENTS) {
    if (p.daysFree >= r.days && p.scansCompleted >= r.scans && p.videosCompleted >= r.videos) {
      earned = r.tier;
      any = true;
    }
  }
  // Before the very first tobacco-free day, no activity tier is earned yet.
  return any ? earned : "bronze";
}

export interface NextTier {
  tier: BadgeTier;
  need: { days: number; scans: number; videos: number };
}

/** The tier above `current` and exactly what's still required to reach it. */
export function nextBadge(current: BadgeTier, p: BadgeProgress): NextTier | null {
  const idx = tierIndex(current);
  if (idx >= BADGE_TIERS.length - 1) return null;
  const req = TIER_REQUIREMENTS[idx + 1];
  return {
    tier: req.tier,
    need: {
      days: Math.max(0, req.days - p.daysFree),
      scans: Math.max(0, req.scans - p.scansCompleted),
      videos: Math.max(0, req.videos - p.videosCompleted),
    },
  };
}

/**
 * The user's current tier = the higher of their form-assigned starting tier
 * and what their real activity has earned. Plus the next tier to chase.
 */
export function currentBadge(
  startingTier: BadgeTier,
  p: BadgeProgress,
): { tier: BadgeTier; next: NextTier | null } {
  const tier = maxTier(startingTier, tierFromProgress(p));
  return { tier, next: nextBadge(tier, p) };
}

// ---- Intake form → summary -------------------------------------------------

export type TobaccoType = "cigarettes" | "bidi" | "gutkha" | "khaini" | "mixed";

/** The instrument that applies to a given tobacco type. */
export function formForType(type: TobaccoType): TobaccoForm {
  return type === "cigarettes" || type === "bidi" ? "smoked" : "smokeless";
}

/** Everything the intake form collects. Drives every downstream number. */
export interface IntakeAnswers {
  tobaccoType: TobaccoType;
  timeToFirst: TimeToFirst;
  hateToGiveUpFirst: boolean;
  moreInMorning: boolean;
  useWhenIll: boolean;
  // smoked
  difficultRefraining?: boolean;
  perDay?: number;
  // smokeless
  swallowJuice?: SwallowJuice;
  cansPerWeek?: number;
  // profile
  yearsOfUse: number;
  perDaySpend: number;
  previousQuitAttempts: number;
  motivation: number; // 0–10 readiness ruler
  triggers: string[];
}

/** Build the discriminated FTND input from raw form answers. */
export function toFtndInput(a: IntakeAnswers): FtndInput {
  if (formForType(a.tobaccoType) === "smoked") {
    return {
      form: "smoked",
      timeToFirst: a.timeToFirst,
      difficultRefraining: a.difficultRefraining ?? false,
      hateToGiveUpFirst: a.hateToGiveUpFirst,
      perDay: a.perDay ?? 0,
      moreInMorning: a.moreInMorning,
      useWhenIll: a.useWhenIll,
    };
  }
  return {
    form: "smokeless",
    timeToFirst: a.timeToFirst,
    swallowJuice: a.swallowJuice ?? "never",
    hateToGiveUpFirst: a.hateToGiveUpFirst,
    cansPerWeek: a.cansPerWeek ?? 0,
    moreInMorning: a.moreInMorning,
    useWhenIll: a.useWhenIll,
  };
}

export interface IntakeSummary {
  ftnd: number;
  dependence: DependenceBand;
  readiness: number;
  stage: StageOfChange;
  startingTier: BadgeTier;
}

/** The one place the form's answers become a badge + scores. Pure + tested. */
export function summarizeIntake(a: IntakeAnswers): IntakeSummary {
  const ftnd = scoreFtnd(toFtndInput(a));
  const readiness = readinessScore(a.motivation);
  return {
    ftnd,
    dependence: dependenceBand(ftnd),
    readiness,
    stage: stageOfChange(a.motivation),
    startingTier: startingBadgeTier(readiness, ftnd),
  };
}
