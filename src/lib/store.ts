"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Language } from "@/data/types";
import { toISODate } from "@/lib/format";
import type { CheckIn, Slip } from "@/lib/health";
import { summarizeIntake, type IntakeAnswers, type IntakeSummary } from "@/lib/scoring";

export type VideoStatus = "not-started" | "in-progress" | "completed";
export interface VideoProgress {
  status: VideoStatus;
  percent: number;
  completedAt?: string;
}

export interface ClaimedReward {
  id: string;
  claimedAt: string;
  code: string;
  redeemed?: boolean;
}

export interface ScanRecord {
  id: string;
  date: string;
  /** Days since quitting at the time of the scan. */
  dayIndex: number;
  /** 0–100 oral-health tracking score (lower = healthier). */
  score: number;
  /** The visible symptom-checklist answers the score is derived from. */
  answers: Record<string, string>;
  /** IndexedDB key for the photo (images never go in localStorage). */
  imageKey?: string;
  note?: string;
}

interface PersistedState {
  language: Language;
  hasOnboarded: boolean;
  isGuest: boolean;
  displayName?: string;
  intakeAnswers?: IntakeAnswers;
  intake?: IntakeSummary;
  quitDate?: string;
  slips: Slip[];
  checkIns: CheckIn[];
  savingsGoal?: number;
  claimed: Record<string, ClaimedReward>;
  videos: Record<string, VideoProgress>;
  scanDisclaimerAck: boolean;
  scans: ScanRecord[];
  savedAt?: string;
}

interface Actions {
  setLanguage: (lang: Language) => void;
  completeIntake: (answers: IntakeAnswers, quitDate?: string) => IntakeSummary;
  setQuitDate: (date: string) => void;
  addCheckIn: (checkIn: CheckIn) => void;
  logSlip: (slip: Slip) => void;
  claimReward: (id: string, code: string) => void;
  redeemReward: (id: string) => void;
  setVideoProgress: (id: string, percent: number) => void;
  ackScanDisclaimer: () => void;
  addScan: (scan: ScanRecord) => void;
  setSavingsGoal: (goal: number) => void;
  saveProgress: (name?: string) => void;
  linkAccount: (name?: string) => void;
  resetAll: () => void;
}

export type Store = PersistedState & Actions;

const initial: PersistedState = {
  language: "en",
  hasOnboarded: false,
  isGuest: true,
  slips: [],
  checkIns: [],
  claimed: {},
  videos: {},
  scanDisclaimerAck: false,
  scans: [],
};

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...initial,

      setLanguage: (language) => set({ language }),

      completeIntake: (answers, quitDate) => {
        const intake = summarizeIntake(answers);
        set({
          intakeAnswers: answers,
          intake,
          savingsGoal: Math.max(500, answers.perDaySpend * 30),
          quitDate: quitDate ?? toISODate(new Date()),
          hasOnboarded: true,
        });
        return intake;
      },

      setQuitDate: (quitDate) => set({ quitDate }),

      addCheckIn: (checkIn) =>
        set((s) => {
          // One daily check-in per date: replace same-day entry, else append.
          const rest = s.checkIns.filter((c) => c.date !== checkIn.date);
          return { checkIns: [...rest, checkIn] };
        }),

      logSlip: (slip) =>
        set((s) => ({
          // Slips are kept in history and never wipe claimed rewards.
          slips: [...s.slips.filter((x) => x.date !== slip.date), slip],
        })),

      claimReward: (id, code) =>
        set((s) => ({
          claimed: {
            ...s.claimed,
            [id]: { id, code, claimedAt: toISODate(new Date()) },
          },
        })),

      redeemReward: (id) =>
        set((s) =>
          s.claimed[id]
            ? { claimed: { ...s.claimed, [id]: { ...s.claimed[id], redeemed: true } } }
            : s,
        ),

      setVideoProgress: (id, percent) =>
        set((s) => {
          const prev = s.videos[id];
          const clamped = Math.max(0, Math.min(100, Math.round(percent)));
          // Completion is monotonic — once completed it stays completed.
          const completed = prev?.status === "completed" || clamped >= 95;
          return {
            videos: {
              ...s.videos,
              [id]: {
                status: completed ? "completed" : clamped > 0 ? "in-progress" : "not-started",
                percent: completed ? 100 : Math.max(prev?.percent ?? 0, clamped),
                completedAt: completed
                  ? (prev?.completedAt ?? toISODate(new Date()))
                  : undefined,
              },
            },
          };
        }),

      ackScanDisclaimer: () => set({ scanDisclaimerAck: true }),

      addScan: (scan) => set((s) => ({ scans: [...s.scans, scan] })),

      setSavingsGoal: (savingsGoal) => set({ savingsGoal }),

      saveProgress: (name) =>
        set({ isGuest: false, displayName: name, savedAt: toISODate(new Date()) }),

      // Seeds device state from the signed-in account. Never overwrites a name
      // the user set on this device — the local value is the more deliberate one.
      linkAccount: (name) =>
        set((s) => ({
          isGuest: false,
          displayName: s.displayName ?? (name || undefined),
        })),

      resetAll: () => set({ ...initial }),
    }),
    {
      name: "qt-storage",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedState => ({
        language: s.language,
        hasOnboarded: s.hasOnboarded,
        isGuest: s.isGuest,
        displayName: s.displayName,
        intakeAnswers: s.intakeAnswers,
        intake: s.intake,
        quitDate: s.quitDate,
        slips: s.slips,
        checkIns: s.checkIns,
        savingsGoal: s.savingsGoal,
        claimed: s.claimed,
        videos: s.videos,
        scanDisclaimerAck: s.scanDisclaimerAck,
        scans: s.scans,
        savedAt: s.savedAt,
      }),
    },
  ),
);

/**
 * Hydration guard. localStorage is only read on the client, so persisted state
 * isn't available during SSR / first paint. Components that depend on it render
 * a skeleton until this returns true — preventing an SSR/client mismatch.
 * useSyncExternalStore keeps it hydration-safe (no setState-in-effect).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useStore.persist.onFinishHydration(cb),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}
