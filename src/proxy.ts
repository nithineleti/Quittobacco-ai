import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, decrypt } from "@/lib/auth/session";

/**
 * Renamed from Middleware in Next.js 16 — same behaviour, new file convention.
 *
 * This is an OPTIMISTIC check only: it reads the signed cookie and nothing
 * else, never the database. Real authorization happens in the Data Access
 * Layer (`src/lib/auth/dal.ts`), close to the data.
 */

/** Reachable signed out. Everything else requires an account. */
const PUBLIC_PATHS = [
  "/login",
  // Password recovery — by definition reached while signed out.
  "/forgot",
  "/reset",
  // PWA offline fallback — must render with no network and no session.
  "/offline",
  // A read-only page a family member opens from a shared link. Requiring an
  // account here would break the whole supporter feature.
  "/supporter",
];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const session = await decrypt(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session && !isPublic(path)) {
    const url = new URL("/login", req.nextUrl);
    // Remember where they were headed so login can send them back.
    if (path !== "/") url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Signed-in visitors are deliberately NOT bounced off /login. It carries the
  // language picker, and silently redirecting made that unreachable for anyone
  // already signed in. The page itself shows a "you're signed in" state instead.

  return NextResponse.next();
}

export const config = {
  // Skip API routes, Next internals, and anything with a file extension
  // (icons, sw.js, manifest) — those must stay reachable signed out.
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[\\w]+$).*)"],
};
