"use server";

import {
  FOREIGN_KEY_VIOLATION,
  loadUserState,
  saveUserState,
} from "@/lib/auth/db";
import { readSession } from "@/lib/auth/session";

/**
 * Backup and restore of the quit journey.
 *
 * The DEVICE remains the working copy. This app has to keep working on a dead
 * 3G signal — SOS and the breathing timer especially — so the server is a
 * mirror, not the source of truth. Conflicts resolve last-write-wins on the
 * device's own clock.
 */

/** Rejects absurd payloads rather than letting one device wedge the column. */
const MAX_BYTES = 512 * 1024;

export interface PulledState {
  /** Who the server thinks this session belongs to. */
  userId: string;
  /** null when this account has never synced. */
  state: unknown | null;
  updatedAt: string | null;
}

/**
 * Returns the owner even when there is no saved state yet — the client needs
 * the identity to notice that a DIFFERENT person is now using this device.
 */
export async function pullUserState(): Promise<PulledState | null> {
  const session = await readSession();
  if (!session) return null;

  const row = await loadUserState(session.userId);
  return {
    userId: session.userId,
    state: row?.state ?? null,
    updatedAt: row ? new Date(row.updated_at).toISOString() : null,
  };
}

export interface PushResult {
  ok: boolean;
  /** The timestamp now authoritative on the server. */
  updatedAt?: string;
  /** False when the server already held something newer. */
  stored?: boolean;
  error?: "unauthenticated" | "too-large" | "failed";
}

export async function pushUserState(
  state: unknown,
  updatedAt: string,
): Promise<PushResult> {
  const session = await readSession();
  if (!session) return { ok: false, error: "unauthenticated" };

  const serialized = JSON.stringify(state);
  if (serialized.length > MAX_BYTES) {
    console.warn(
      `Refusing oversized state for ${session.userId}: ${serialized.length} bytes`,
    );
    return { ok: false, error: "too-large" };
  }

  // Reject a client clock so far ahead it would pin the row permanently.
  const when = new Date(updatedAt);
  if (Number.isNaN(when.getTime())) return { ok: false, error: "failed" };
  const ceiling = Date.now() + 5 * 60 * 1000;
  const safe = when.getTime() > ceiling ? new Date() : when;

  try {
    const res = await saveUserState(session.userId, state, safe.toISOString());
    return {
      ok: true,
      stored: res.stored,
      updatedAt: new Date(res.updated_at).toISOString(),
    };
  } catch (err) {
    // Foreign-key violation means the account row is gone (deleted, or the
    // database was reset) while this browser still holds a valid cookie. That
    // is a stale session, not a server fault — report it as such so the client
    // stops retrying, and don't log a stack trace for an expected condition.
    if ((err as { code?: string })?.code === FOREIGN_KEY_VIOLATION) {
      return { ok: false, error: "unauthenticated" };
    }
    console.error("pushUserState failed", err);
    return { ok: false, error: "failed" };
  }
}
