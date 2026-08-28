import { describe, expect, it } from "vitest";
import { toISODate } from "./format";
import { activeDaysSinceQuit, rewardContext } from "./selectors";
import type { Store } from "./store";

const NOW = new Date("2026-03-20T12:00:00");

/** Minimal store stub — only the fields these selectors read. */
function store(over: Partial<Store> = {}): Store {
  return {
    language: "en",
    hasOnboarded: true,
    isGuest: false,
    slips: [],
    checkIns: [],
    claimed: {},
    videos: {},
    scanDisclaimerAck: false,
    scans: [],
    loginDays: [],
    quitDate: "2026-03-01",
    ...over,
  } as unknown as Store;
}

// Uses the app's own date helper deliberately. toISOString() would convert to
// UTC and shift every date back a day in IST, silently skewing the fixtures.
const range = (from: string, n: number): string[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(`${from}T00:00:00`);
    d.setDate(d.getDate() + i);
    return toISODate(d);
  });

describe("activeDaysSinceQuit", () => {
  it("is zero before a quit date is set", () => {
    expect(activeDaysSinceQuit(store({ quitDate: undefined }), NOW)).toBe(0);
  });

  it("counts only days the user actually opened the app", () => {
    // 19 calendar days have elapsed, but only 4 visits.
    const s = store({ loginDays: ["2026-03-01", "2026-03-05", "2026-03-09", "2026-03-20"] });
    expect(activeDaysSinceQuit(s, NOW)).toBe(4);
  });

  it("ignores logins from before the quit date", () => {
    const s = store({ loginDays: ["2026-02-20", "2026-02-28", "2026-03-02"] });
    expect(activeDaysSinceQuit(s, NOW)).toBe(1);
  });

  it("ignores dates in the future (a device with a wrong clock)", () => {
    const s = store({ loginDays: ["2026-03-02", "2027-01-01"] });
    expect(activeDaysSinceQuit(s, NOW)).toBe(1);
  });

  it("never double-counts a repeated date", () => {
    const s = store({ loginDays: ["2026-03-02", "2026-03-02", "2026-03-03"] });
    expect(activeDaysSinceQuit(s, NOW)).toBe(2);
  });

  it("restarts counting after a slip", () => {
    const s = store({
      loginDays: range("2026-03-01", 20),
      slips: [{ date: "2026-03-15" }],
    });
    // Only 2026-03-16 onwards counts: 16th–20th inclusive.
    expect(activeDaysSinceQuit(s, NOW)).toBe(5);
  });
});

describe("rewards are earned by showing up, not by elapsed time", () => {
  it("does NOT unlock a 7-day reward from calendar time alone", () => {
    // Quit date backdated 19 days, but the app was opened just twice.
    const s = store({ loginDays: ["2026-03-01", "2026-03-02"] });
    expect(rewardContext(s, NOW).streakDays).toBe(2);
  });

  it("unlocks once enough real days are logged", () => {
    const s = store({ loginDays: range("2026-03-01", 7) });
    expect(rewardContext(s, NOW).streakDays).toBe(7);
  });

  it("closes the backdating hole: no logins means nothing earned", () => {
    const s = store({ quitDate: "2025-01-01", loginDays: [] });
    expect(rewardContext(s, NOW).streakDays).toBe(0);
  });
});
