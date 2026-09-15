import { NextResponse, type NextRequest } from "next/server";
import {
  FOREIGN_KEY_VIOLATION,
  loadUserState,
  saveUserState,
} from "@/lib/auth/db";
import { readSession } from "@/lib/auth/session";
import { MAX_SYNC_BYTES, type PulledState, type PushResult } from "@/lib/syncProtocol";

export const dynamic = "force-dynamic";

/**
 * Backup and restore of the quit journey — see syncProtocol.ts for why this is
 * a route handler rather than a Server Action.
 *
 * The DEVICE remains the working copy. This app has to keep working on a dead
 * 3G signal — SOS and the breathing timer especially — so the server is a
 * mirror, not the source of truth. Conflicts resolve last-write-wins on the
 * device's own clock.
 */

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * CSRF guard. Server Actions had this built in; a route handler has to do it
 * itself. A cross-site page cannot send a JSON body without a CORS preflight
 * (which this route never answers), and Sec-Fetch-Site is set by every
 * current browser and cannot be forged by page script.
 */
function sameOrigin(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin GETs carry no Origin header
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Returns the owner even when there is no saved state yet — the client needs
 * the identity to notice that a DIFFERENT person is now using this device.
 */
export async function GET(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse(null, { status: 403 });
  const session = await readSession();
  if (!session) return new NextResponse(null, { status: 401, headers: NO_STORE });

  const row = await loadUserState(session.userId);
  const body: PulledState = {
    userId: session.userId,
    state: row?.state ?? null,
    updatedAt: row ? new Date(row.updated_at).toISOString() : null,
  };
  return NextResponse.json(body, { headers: NO_STORE });
}

export async function PUT(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse(null, { status: 403 });
  const session = await readSession();
  if (!session) return new NextResponse(null, { status: 401, headers: NO_STORE });

  const raw = await req.text();
  if (raw.length > MAX_SYNC_BYTES) {
    console.warn(`Refusing oversized state for ${session.userId}: ${raw.length} bytes`);
    return new NextResponse(null, { status: 413, headers: NO_STORE });
  }

  let state: unknown;
  let updatedAt: string;
  try {
    const parsed = JSON.parse(raw) as { state?: unknown; updatedAt?: unknown };
    if (parsed.state === undefined || typeof parsed.updatedAt !== "string") throw new Error();
    state = parsed.state;
    updatedAt = parsed.updatedAt;
  } catch {
    return new NextResponse(null, { status: 400, headers: NO_STORE });
  }

  // Reject a client clock so far ahead it would pin the row permanently.
  const when = new Date(updatedAt);
  if (Number.isNaN(when.getTime())) return new NextResponse(null, { status: 400, headers: NO_STORE });
  const ceiling = Date.now() + 5 * 60 * 1000;
  const safe = when.getTime() > ceiling ? new Date() : when;

  try {
    const res = await saveUserState(session.userId, state, safe.toISOString());
    const body: PushResult = {
      ok: true,
      stored: res.stored,
      updatedAt: new Date(res.updated_at).toISOString(),
    };
    return NextResponse.json(body, { headers: NO_STORE });
  } catch (err) {
    // Foreign-key violation means the account row is gone (deleted, or the
    // database was reset) while this browser still holds a valid cookie. That
    // is a stale session, not a server fault — say so, so the client stops
    // retrying, and don't log a stack trace for an expected condition.
    if ((err as { code?: string })?.code === FOREIGN_KEY_VIOLATION) {
      return new NextResponse(null, { status: 401, headers: NO_STORE });
    }
    console.error("sync push failed", err);
    return new NextResponse(null, { status: 500, headers: NO_STORE });
  }
}
