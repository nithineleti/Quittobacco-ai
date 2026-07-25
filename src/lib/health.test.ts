import { describe, expect, it } from "vitest";
import { addDays, toISODate } from "@/lib/format";
import {
  computeTriggerInsight,
  currentStreakDays,
  moneySaved,
  nextMilestone,
  reachedMilestones,
  recoveryPercent,
  savingsGoalPercent,
  tangibleSavings,
  totalFreeDays,
  type CheckIn,
  type RecoveryMilestone,
} from "@/lib/health";

const NOW = new Date(2026, 6, 16, 10, 0, 0); // 16 Jul 2026, local
const ago = (n: number) => toISODate(addDays(NOW, -n));

describe("streak across slips (compassionate)", () => {
  it("counts days since quitting when there are no slips", () => {
    expect(currentStreakDays(ago(10), [], NOW)).toBe(10);
  });

  it("resets the current run to the day after the most recent slip", () => {
    expect(currentStreakDays(ago(10), [ago(3)], NOW)).toBe(2);
  });

  it("is 0 on the day of a slip", () => {
    expect(currentStreakDays(ago(10), [ago(0)], NOW)).toBe(0);
  });

  it("keeps total free days across the journey, minus slip days", () => {
    expect(totalFreeDays(ago(10), [], NOW)).toBe(10);
    expect(totalFreeDays(ago(10), [ago(3)], NOW)).toBe(9);
    expect(totalFreeDays(ago(30), [ago(3), ago(12)], NOW)).toBe(28);
  });
});

describe("money & savings", () => {
  it("multiplies spend by free days", () => {
    expect(moneySaved(50, 24)).toBe(1200);
    expect(moneySaved(-5, 24)).toBe(0);
  });

  it("computes clamped goal progress", () => {
    expect(savingsGoalPercent(250, 500)).toBe(50);
    expect(savingsGoalPercent(600, 500)).toBe(100);
    expect(savingsGoalPercent(100, 0)).toBe(0);
  });

  it("maps an amount to a relatable comparison id", () => {
    expect(tangibleSavings(100)).toBe("chai");
    expect(tangibleSavings(200)).toBe("meal");
    expect(tangibleSavings(5000)).toBe("groceries");
    expect(tangibleSavings(25000)).toBe("smartphone");
  });
});

describe("recoveryPercent", () => {
  it("starts at 0, rises monotonically and never exceeds 100", () => {
    expect(recoveryPercent(0)).toBe(0);
    expect(recoveryPercent(30)).toBeGreaterThan(0);
    expect(recoveryPercent(30)).toBeLessThan(recoveryPercent(180));
    expect(recoveryPercent(100000)).toBeLessThanOrEqual(100);
  });
});

describe("recovery milestones", () => {
  const milestones: RecoveryMilestone[] = [
    { day: 1, label: "20 minutes", benefit: "heart rate drops", source: "who" },
    { day: 14, label: "2 weeks", benefit: "circulation improves", source: "who" },
    { day: 90, label: "3 months", benefit: "lungs recover", source: "who" },
  ];

  it("marks milestones reached by free days", () => {
    const r = reachedMilestones(20, milestones);
    expect(r.map((m) => m.reached)).toEqual([true, true, false]);
  });

  it("returns the next milestone with a countdown", () => {
    expect(nextMilestone(20, milestones)).toMatchObject({ day: 90, daysRemaining: 70 });
    expect(nextMilestone(200, milestones)).toBeNull();
  });
});

describe("computeTriggerInsight", () => {
  it("returns null until enough check-ins are logged", () => {
    const few: CheckIn[] = Array.from({ length: 5 }, (_, i) => ({
      date: ago(i),
      hour: 16,
      cravingLevel: 4,
      usedToday: false,
      triggerId: "after-meals",
    }));
    expect(computeTriggerInsight(few)).toBeNull();
  });

  it("finds the strong-craving window and the top trigger", () => {
    const checkIns: CheckIn[] = [
      ...Array.from({ length: 6 }, (_, i) => ({
        date: ago(i),
        hour: 16,
        cravingLevel: 4,
        usedToday: false,
        triggerId: "after-meals",
      })),
      { date: ago(6), hour: 9, cravingLevel: 1, usedToday: false, triggerId: "morning" },
      { date: ago(7), hour: 9, cravingLevel: 1, usedToday: false, triggerId: "morning" },
    ];
    const insight = computeTriggerInsight(checkIns);
    expect(insight).not.toBeNull();
    expect(insight!.window).toBe("4–6 pm");
    expect(insight!.topTriggerId).toBe("after-meals");
    expect(insight!.sampleSize).toBe(6);
  });
});
