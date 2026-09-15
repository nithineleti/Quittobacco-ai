import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, decrypt } from "@/lib/auth/session";

/**
 * Renamed from Middleware in Next.js 16 — same behaviour, new file convention.
 *
 * This is an OPTIMISTIC check only: it reads the signed cookie and nothing
 * else, never the database. Real authorization happens in the Data Access
 * Layer (`src/lib/auth/dal.ts`), close to the data.
 *
 * Also mints the per-request nonce for the script-src CSP (see buildCsp
 * below) — closing the one gap the security review had previously left open,
 * since a page's own inline theme script needed it before `script-src` could
 * be tightened beyond "allow everything inline."
 */

function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic' + a per-request nonce is what lets Next's own chunk
    // loader work while still blocking an attacker's injected <script>, which
    // has no way to know the nonce. 'unsafe-eval' is dev-only: React uses it
    // there to reconstruct server error stacks in the browser; production
    // needs neither React nor Next to eval anything.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Not nonce'd, in either environment — verified against a live run of the
    // app, not assumed: Chromium checks style-src against React's runtime
    // style={{...}} prop mutations too, not just <style> tags and static
    // style="" attributes, and this app uses plenty of those (progress bars,
    // badge colours, canvas positioning). Nonce-ing style-src would mean
    // finding and rewriting every one of them for a directive that defends
    // against a far smaller risk (CSS injection) than script-src does
    // (arbitrary script execution) — a bad trade for "general hardening."
    "style-src 'self' 'unsafe-inline'",
    // blob:/data: cover the canvas-generated scratch-card and share-image PNGs.
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Only in production: this instructs the BROWSER to rewrite http -> https
    // on this page, which would break testing on a phone over the LAN at
    // http://192.168.x.x — the same reason Secure cookies and HSTS are also
    // production-only elsewhere in this app.
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

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

  // A fresh nonce every request — reusing one would let an attacker who
  // captures it once replay it against a later page. Matches Next's own
  // documented idiom exactly, since Next's automatic nonce-detection on its
  // own injected scripts is regex-matched against this precise CSP shape.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV !== "production");

  if (!session && !isPublic(path)) {
    const url = new URL("/login", req.nextUrl);
    // Remember where they were headed so login can send them back.
    if (path !== "/") url.searchParams.set("next", path);
    const res = NextResponse.redirect(url);
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  // Signed-in visitors are deliberately NOT bounced off /login. It carries the
  // language picker, and silently redirecting made that unreachable for anyone
  // already signed in. The page itself shows a "you're signed in" state instead.

  // The nonce reaches the root layout as a request header (x-nonce), which it
  // reads via headers() to put on the one inline <script> this app writes
  // itself — Next attaches the same nonce to its own generated scripts
  // automatically once it sees the pattern in the CSP response header.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  // Skip API routes, Next internals, and anything with a file extension
  // (icons, sw.js, manifest) — those must stay reachable signed out.
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[\\w]+$).*)"],
};
