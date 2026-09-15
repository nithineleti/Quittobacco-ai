/**
 * The wire protocol between the device and `/api/sync`.
 *
 * Sync used to be a pair of Server Actions. That was the wrong tool: a Server
 * Action's response is a React Flight stream that re-renders the current page
 * on every call, so every 1.5-second debounced push re-rendered the dashboard
 * for nothing — and on the entry page, `router.replace()` fired while the
 * push's stream was still arriving, which crashed React's Flight client
 * ("Cannot read properties of null (reading 'enqueueModel')") and dropped the
 * user onto the error boundary. A plain JSON route has no stream and no page
 * re-render, so there is nothing to race.
 */

/** Rejects absurd payloads rather than letting one device wedge the column. */
export const MAX_SYNC_BYTES = 512 * 1024;

export interface PulledState {
  /** Who the server thinks this session belongs to. */
  userId: string;
  /** null when this account has never synced. */
  state: unknown | null;
  updatedAt: string | null;
}

export interface PushResult {
  ok: boolean;
  /** The timestamp now authoritative on the server. */
  updatedAt?: string;
  /** False when the server already held something newer. */
  stored?: boolean;
  error?: "unauthenticated" | "too-large" | "failed";
}

/** null when signed out. Throws when offline or the server is down. */
export async function pullUserState(): Promise<PulledState | null> {
  const res = await fetch("/api/sync", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`sync pull failed: ${res.status}`);
  return (await res.json()) as PulledState;
}

export async function pushUserState(
  state: unknown,
  updatedAt: string,
): Promise<PushResult> {
  const body = JSON.stringify({ state, updatedAt });
  const res = await fetch("/api/sync", {
    method: "PUT",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body,
    // keepalive lets the pagehide flush outlive the page — but browsers cap
    // keepalive bodies at 64 KB, and a fetch over the cap is rejected outright.
    keepalive: body.length < 60_000,
  });
  if (res.status === 401) return { ok: false, error: "unauthenticated" };
  if (res.status === 413) return { ok: false, error: "too-large" };
  if (!res.ok) return { ok: false, error: "failed" };
  return (await res.json()) as PushResult;
}
