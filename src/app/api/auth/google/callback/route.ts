import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import {
  createUser,
  findUserByEmail,
  isUniqueViolation,
  logLoginEvent,
} from "@/lib/auth/db";
import { OAUTH_STATE_COOKIE, resolveGoogleIdentity } from "@/lib/auth/google";
import { createSession } from "@/lib/auth/session";
import { baseUrl } from "@/lib/auth/url";

export const dynamic = "force-dynamic";

/**
 * Step 2: Google redirects back here with a one-time `code` (or an `error`).
 *
 * Every failure path redirects to the SAME `/login?error=google` — Google's
 * own error reasons (access_denied, a forged state, a replayed code) are not
 * shown to the visitor, only logged, so this can't be used to fingerprint why
 * a particular sign-in attempt failed.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const oauthError = params.get("error");

  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE);

  const h = await headers();
  const userAgent = h.get("user-agent") ?? undefined;
  // Vercel and most proxies set this; it is client-reported and only used for
  // the audit log, never for an access-control decision.
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  const fail = async (reason: string, email = "") => {
    await logLoginEvent({
      userId: null,
      email: email || "(unknown)",
      method: "google",
      action: "sign_in",
      success: false,
      reason,
      ip,
      userAgent,
    });
    redirect("/login?error=google");
  };

  if (oauthError || !code || !state || !expectedState || state !== expectedState) {
    return fail(oauthError ?? "bad_state");
  }

  let identity: Awaited<ReturnType<typeof resolveGoogleIdentity>>;
  try {
    const redirectUri = `${await baseUrl()}/api/auth/google/callback`;
    identity = await resolveGoogleIdentity(code, redirectUri);
  } catch (err) {
    console.error("Google sign-in failed", err);
    return fail("exchange_failed");
  }

  if (!identity.emailVerified) {
    return fail("email_unverified", identity.email);
  }

  let user = await findUserByEmail(identity.email);

  if (!user) {
    try {
      user = await createUser({
        id: randomUUID(),
        email: identity.email,
        // No password: this account exists only via Google. verifyPassword is
        // never reached for it — signIn short-circuits on a null hash first.
        passwordHash: null,
        displayName: identity.name,
        language: "en",
      });
    } catch (err) {
      // Lost a race with a concurrent signup for the same address.
      if (isUniqueViolation(err)) user = await findUserByEmail(identity.email);
      if (!user) return fail("create_failed", identity.email);
    }
  }

  await createSession({
    userId: user.id,
    email: user.email,
    language: user.language,
    v: user.token_version,
  });

  await logLoginEvent({
    userId: user.id,
    email: user.email,
    method: "google",
    action: "sign_in",
    success: true,
    ip,
    userAgent,
  });

  redirect("/");
}
