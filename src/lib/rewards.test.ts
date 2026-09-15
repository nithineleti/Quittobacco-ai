import { describe, expect, it } from "vitest";
import {
  ladderWithStatus,
  nextReward,
  REWARD_LADDER,
  rewardStatus,
  type RewardContext,
} from "@/lib/rewards";

const rung = (id: string) => REWARD_LADDER.find((r) => r.id === id)!;

const ctx = (over: Partial<RewardContext> = {}): RewardContext => ({
  streakDays: 0,
  totalCheckIns: 0,
  claimedIds: [],
  ...over,
});

describe("rewardStatus — digital", () => {
  it("is locked before the day, with days remaining", () => {
    const s = rewardStatus(rung("day7"), ctx({ streakDays: 3 }));
    expect(s.state).toBe("locked");
    expect(s.daysRemaining).toBe(4);
  });

  it("is claimable at/after the day (self-reported)", () => {
    expect(rewardStatus(rung("day7"), ctx({ streakDays: 7 })).state).toBe("claimable");
    expect(rewardStatus(rung("day3"), ctx({ streakDays: 9 })).state).toBe("claimable");
  });
});

describe("rewardStatus — real reward integrity (§3.6)", () => {
  it("will NOT unlock the dental visit on streak alone", () => {
    const s = rewardStatus(rung("day15"), ctx({ streakDays: 15 }));
    expect(s.state).toBe("needs-evidence");
    expect(s.missing).toEqual(["10 more daily check-ins"]);
  });

  it("counts down the check-ins still required", () => {
    const s = rewardStatus(rung("day15"), ctx({ streakDays: 15, totalCheckIns: 7 }));
    expect(s.state).toBe("needs-evidence");
    expect(s.missing).toEqual(["3 more daily check-ins"]);
  });

  it("unlocks once the check-in evidence is present", () => {
    const s = rewardStatus(rung("day15"), ctx({ streakDays: 16, totalCheckIns: 10 }));
    expect(s.state).toBe("claimable");
  });

  it("holds a later rung to its own, higher check-in bar", () => {
    const s = rewardStatus(rung("day90"), ctx({ streakDays: 95, totalCheckIns: 40 }));
    expect(s.state).toBe("needs-evidence");
    expect(s.missing).toEqual(["20 more daily check-ins"]);
  });
});

describe("slips never wipe earned rewards", () => {
  it("keeps a claimed reward claimed even when the streak has reset to 0", () => {
    const s = rewardStatus(rung("day1"), ctx({ streakDays: 0, claimedIds: ["day1"] }));
    expect(s.state).toBe("claimed");
  });
});

describe("nextReward & ladder", () => {
  it("returns the nearest unclaimed rung", () => {
    const n = nextReward(ctx({ streakDays: 4, claimedIds: ["day1", "day3"] }));
    expect(n?.rung.id).toBe("day7");
  });

  it("covers the whole ladder", () => {
    expect(ladderWithStatus(ctx())).toHaveLength(REWARD_LADDER.length);
    expect(REWARD_LADDER.map((r) => r.day)).toEqual([1, 3, 7, 15, 30, 90, 180, 365]);
  });
});
