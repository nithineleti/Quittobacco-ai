import { describe, expect, it } from "vitest";
import {
  currentBadge,
  dependenceBand,
  formForType,
  nextBadge,
  readinessScore,
  scoreFtnd,
  stageOfChange,
  startingBadgeTier,
  summarizeIntake,
  type FtndInput,
  type IntakeAnswers,
} from "@/lib/scoring";

describe("scoreFtnd — smoked (FTND)", () => {
  const base: Extract<FtndInput, { form: "smoked" }> = {
    form: "smoked",
    timeToFirst: "after60",
    difficultRefraining: false,
    hateToGiveUpFirst: false,
    perDay: 5,
    moreInMorning: false,
    useWhenIll: false,
  };

  it("scores the minimum as 0", () => {
    expect(scoreFtnd(base)).toBe(0);
  });

  it("scores the maximum as 10", () => {
    expect(
      scoreFtnd({
        ...base,
        timeToFirst: "within5", // 3
        difficultRefraining: true, // 1
        hateToGiveUpFirst: true, // 1
        perDay: 40, // 3
        moreInMorning: true, // 1
        useWhenIll: true, // 1
      }),
    ).toBe(10);
  });

  it("maps time-to-first-use to 3/2/1/0", () => {
    expect(scoreFtnd({ ...base, timeToFirst: "within5" })).toBe(3);
    expect(scoreFtnd({ ...base, timeToFirst: "6to30" })).toBe(2);
    expect(scoreFtnd({ ...base, timeToFirst: "31to60" })).toBe(1);
    expect(scoreFtnd({ ...base, timeToFirst: "after60" })).toBe(0);
  });

  it("maps cigarettes/day at the published boundaries", () => {
    expect(scoreFtnd({ ...base, perDay: 10 })).toBe(0);
    expect(scoreFtnd({ ...base, perDay: 11 })).toBe(1);
    expect(scoreFtnd({ ...base, perDay: 20 })).toBe(1);
    expect(scoreFtnd({ ...base, perDay: 21 })).toBe(2);
    expect(scoreFtnd({ ...base, perDay: 30 })).toBe(2);
    expect(scoreFtnd({ ...base, perDay: 31 })).toBe(3);
  });
});

describe("scoreFtnd — smokeless (FTND-ST)", () => {
  const base: Extract<FtndInput, { form: "smokeless" }> = {
    form: "smokeless",
    timeToFirst: "after60",
    swallowJuice: "never",
    hateToGiveUpFirst: false,
    cansPerWeek: 1,
    moreInMorning: false,
    useWhenIll: false,
  };

  it("scores the minimum as 0 and maximum as 10", () => {
    expect(scoreFtnd(base)).toBe(0);
    expect(
      scoreFtnd({
        ...base,
        timeToFirst: "within5", // 3
        swallowJuice: "always", // 2
        hateToGiveUpFirst: true, // 1
        cansPerWeek: 5, // 2
        moreInMorning: true, // 1
        useWhenIll: true, // 1
      }),
    ).toBe(10);
  });

  it("maps swallowing juice to 0/1/2", () => {
    expect(scoreFtnd({ ...base, swallowJuice: "never" })).toBe(0);
    expect(scoreFtnd({ ...base, swallowJuice: "sometimes" })).toBe(1);
    expect(scoreFtnd({ ...base, swallowJuice: "always" })).toBe(2);
  });

  it("maps cans/week at boundaries (≤1=0, 2–3=1, >3=2)", () => {
    expect(scoreFtnd({ ...base, cansPerWeek: 1 })).toBe(0);
    expect(scoreFtnd({ ...base, cansPerWeek: 2 })).toBe(1);
    expect(scoreFtnd({ ...base, cansPerWeek: 3 })).toBe(1);
    expect(scoreFtnd({ ...base, cansPerWeek: 4 })).toBe(2);
  });
});

describe("dependenceBand", () => {
  it("uses the standard FTND interpretation bands", () => {
    expect(dependenceBand(0).level).toBe("very-low");
    expect(dependenceBand(2).level).toBe("very-low");
    expect(dependenceBand(3).level).toBe("low");
    expect(dependenceBand(4).level).toBe("low");
    expect(dependenceBand(5).level).toBe("moderate");
    expect(dependenceBand(6).level).toBe("high");
    expect(dependenceBand(7).level).toBe("high");
    expect(dependenceBand(8).level).toBe("very-high");
    expect(dependenceBand(10).level).toBe("very-high");
  });
});

describe("readiness & stage", () => {
  it("scales the 0–10 readiness ruler to 0–100 and clamps", () => {
    expect(readinessScore(7)).toBe(70);
    expect(readinessScore(0)).toBe(0);
    expect(readinessScore(12)).toBe(100);
  });

  it("maps motivation to a stage of change", () => {
    expect(stageOfChange(2)).toBe("contemplation");
    expect(stageOfChange(3)).toBe("contemplation");
    expect(stageOfChange(4)).toBe("preparation");
    expect(stageOfChange(7)).toBe("preparation");
    expect(stageOfChange(8)).toBe("action");
  });
});

describe("badge tiers", () => {
  it("starts higher for high motivation + low dependence, capped at gold", () => {
    expect(startingBadgeTier(readinessScore(9), 2)).toBe("gold");
    expect(startingBadgeTier(readinessScore(6), 4)).toBe("silver");
    expect(startingBadgeTier(readinessScore(4), 8)).toBe("bronze");
    // never above gold from the form alone
    expect(startingBadgeTier(100, 0)).toBe("gold");
  });

  it("earns the higher of starting tier and activity, with the right next step", () => {
    const { tier, next } = currentBadge("bronze", {
      daysFree: 7,
      scansCompleted: 1,
      videosCompleted: 2,
    });
    expect(tier).toBe("silver");
    expect(next?.tier).toBe("gold");
    expect(next?.need).toEqual({ days: 23, scans: 1, videos: 2 });
  });

  it("keeps the form's starting tier if activity hasn't caught up", () => {
    const { tier } = currentBadge("gold", {
      daysFree: 3,
      scansCompleted: 0,
      videosCompleted: 0,
    });
    expect(tier).toBe("gold");
  });

  it("returns no next tier at diamond", () => {
    expect(
      nextBadge("diamond", { daysFree: 400, scansCompleted: 9, videosCompleted: 9 }),
    ).toBeNull();
  });
});

describe("summarizeIntake", () => {
  it("routes tobacco type to the right instrument", () => {
    expect(formForType("cigarettes")).toBe("smoked");
    expect(formForType("bidi")).toBe("smoked");
    expect(formForType("gutkha")).toBe("smokeless");
    expect(formForType("khaini")).toBe("smokeless");
    expect(formForType("mixed")).toBe("smokeless");
  });

  it("turns a high-motivation, low-dependence gutkha user into a gold start", () => {
    const answers: IntakeAnswers = {
      tobaccoType: "gutkha",
      timeToFirst: "after60",
      hateToGiveUpFirst: false,
      moreInMorning: false,
      useWhenIll: false,
      swallowJuice: "never",
      cansPerWeek: 1,
      yearsOfUse: 3,
      perDaySpend: 40,
      previousQuitAttempts: 1,
      motivation: 9,
      triggers: ["after-meals"],
    };
    const s = summarizeIntake(answers);
    expect(s.ftnd).toBe(0);
    expect(s.dependence.level).toBe("very-low");
    expect(s.readiness).toBe(90);
    expect(s.stage).toBe("action");
    expect(s.startingTier).toBe("gold");
  });

  it("turns a heavy, low-motivation smoker into a bronze start", () => {
    const answers: IntakeAnswers = {
      tobaccoType: "cigarettes",
      timeToFirst: "within5",
      hateToGiveUpFirst: true,
      moreInMorning: true,
      useWhenIll: true,
      difficultRefraining: true,
      perDay: 25,
      yearsOfUse: 20,
      perDaySpend: 300,
      previousQuitAttempts: 0,
      motivation: 3,
      triggers: ["stress"],
    };
    const s = summarizeIntake(answers);
    expect(s.ftnd).toBe(9);
    expect(s.dependence.level).toBe("very-high");
    expect(s.startingTier).toBe("bronze");
  });
});
