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
  scanDays: [],
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
    expect(s.missing).toEqual([
      "a completed oral scan on or after day 15",
      "10 more daily check-ins",
    ]);
  });

  it("still needs the scan even with enough check-ins", () => {
    const s = rewardStatus(rung("day15"), ctx({ streakDays: 15, totalCheckIns: 12 }));
    expect(s.state).toBe("needs-evidence");
    expect(s.missing).toEqual(["a completed oral scan on or after day 15"]);
  });

  it("unlocks once both scan and check-in evidence are present", () => {
    const s = rewardStatus(
      rung("day15"),
      ctx({ streakDays: 16, totalCheckIns: 10, scanDays: [0, 15] }),
    );
    expect(s.state).toBe("claimable");
  });

  it("rejects a scan taken too early", () => {
    const s = rewardStatus(
      rung("day90"),
      ctx({ streakDays: 95, totalCheckIns: 80, scanDays: [0, 30] }),
    );
    expect(s.state).toBe("needs-evidence");
    expect(s.missing).toContain("a completed oral scan on or after day 90");
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
