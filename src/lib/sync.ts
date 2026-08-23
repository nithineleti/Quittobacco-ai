"use client";

import { useSyncExternalStore } from "react";
import { useStore, type PersistedState } from "@/lib/store";
import { pullUserState, pushUserState } from "@/lib/auth/sync-actions";

/**
 * Mirrors the quit journey between this device and the account.
 *
 * The device stays the working copy: every write lands locally first, so the
 * app keeps working with no signal (which SOS depends on). The server is a
 * backup that also restores the journey onto a reinstall or a second phone.
 *
 * Conflicts are last-write-wins on the device clock. Two phones edited offline
 * in the same window means the later save wins — acceptable for a single-user
 * journal, and far simpler than merging.
 *
 * Scan PHOTOS are never synced: they live in IndexedDB and are far too large.
 * Only each scan's score and answers travel, so a restored device shows the
 * history and trend without the images.
 *
 * This lives in a module rather than a component because the entry gate at `/`
 * must AWAIT the first restore before deciding onboarding-vs-dashboard, while
 * several different routes need the syncing behaviour mounted.
 */

/** When this device last changed something. Outside the store, so writing it can't retrigger a sync. */
const MARK_KEY = "qt-sync-at";
/** Which account the journey currently on this device belongs to. */
const OWNER_KEY = "qt-sync-owner";
const DEBOUNCE_MS = 1500;

export type SyncStatus = "idle" | "syncing" | "done";

let status: SyncStatus = "idle";
let initial: Promise<void> | null = null;
let applying = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastSent = "";

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function setStatus(next: SyncStatus) {
  if (status === next) return;
  status = next;
  emit();
}

function readMark(): string {
  try {
    return localStorage.getItem(MARK_KEY) ?? "";
  } catch {
    return "";
  }
}
function writeMark(iso: string): void {
  try {
    localStorage.setItem(MARK_KEY, iso);
  } catch {
    // Private mode / storage disabled — sync degrades to push-only.
  }
}

function readOwner(): string {
  try {
    return localStorage.getItem(OWNER_KEY) ?? "";
  } catch {
    return "";
  }
}
function writeOwner(id: string): void {
  try {
    localStorage.setItem(OWNER_KEY, id);
  } catch {
    // ignore
  }
}

/** Exactly the slice `persist` writes, so both copies stay comparable. */
function snapshot(): PersistedState {
  const s = useStore.getState();
  return {
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
  };
}

async function push(): Promise<void> {
  const state = snapshot();
  const body = JSON.stringify(state);
  if (body === lastSent) return; // nothing actually changed

  const at = new Date().toISOString();
  const res = await pushUserState(state, at);
  if (res.ok) {
    lastSent = body;
    writeMark(res.updatedAt ?? at);
  }
}

/**
 * Runs the initial pull/push exactly once per page load, however many
 * components ask for it.
 */
export function ensureSync(): Promise<void> {
  initial ??= (async () => {
    setStatus("syncing");
    try {
      const remote = await pullUserState();
      if (!remote) return; // signed out — nothing to sync

      const owner = readOwner();
      const sameOwner = owner === remote.userId;

      if (owner && !sameOwner) {
        // A DIFFERENT person just signed in on this phone. Whatever is on the
        // device belongs to the previous user: never show it to this one, and
        // never push it into their account. Shared family phones are common
        // for this audience, so this is a privacy boundary, not a nicety.
        applying = true;
        useStore.getState().resetAll();
        if (remote.state) {
          useStore
            .getState()
            .adoptServerState(remote.state as Partial<PersistedState>);
        }
        applying = false;
        writeOwner(remote.userId);
        writeMark(remote.updatedAt ?? "");
        lastSent = JSON.stringify(snapshot());
        return;
      }

      writeOwner(remote.userId);
      const localMark = readMark();

      if (remote.state && remote.updatedAt && (!localMark || remote.updatedAt > localMark)) {
        // The account holds something this device has never seen.
        applying = true;
        useStore
          .getState()
          .adoptServerState(remote.state as Partial<PersistedState>);
        writeMark(remote.updatedAt);
        lastSent = JSON.stringify(remote.state);
        applying = false;
      } else {
        // This device is the newer copy, or the server has nothing yet.
        await push();
      }
    } catch {
      // Offline or the server is down. The device copy is untouched and
      // authoritative; sync resumes on the next load.
    } finally {
      setStatus("done");
    }
  })();
  return initial;
}

/** Debounced push, called on every local change once the first sync is done. */
export function schedulePush(): void {
  if (status !== "done" || applying) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void push(), DEBOUNCE_MS);
}

/** Best effort on the way out — backgrounding a PWA often kills the timer. */
export function flushPush(): void {
  if (status !== "done" || applying) return;
  if (timer) clearTimeout(timer);
  void push();
}

/** Awaitable flush, so sign-out can guarantee the journey reached the server. */
export async function flushNow(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  if (status !== "done" || applying) return;
  try {
    await push();
  } catch {
    // Offline. The device copy stays put; nothing is lost that could be saved.
  }
}

/**
 * Sign-out housekeeping. Pushes anything outstanding, then wipes the journey
 * off this device.
 *
 * Clearing is safe precisely BECAUSE the journey is now backed up — it comes
 * straight back on the next sign-in. And it is necessary: this phone may be
 * shared, and the next person must not find someone else's streak, scans and
 * name sitting there.
 */
export async function signOutCleanup(): Promise<void> {
  await flushNow();
  useStore.getState().resetAll();
  resetSync();
}

/** Forgets everything, so the next user on this device starts clean. */
export function resetSync(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  initial = null;
  lastSent = "";
  status = "idle";
  try {
    localStorage.removeItem(MARK_KEY);
    localStorage.removeItem(OWNER_KEY);
  } catch {
    // ignore
  }
  emit();
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status,
    () => "idle" as const,
  );
}
