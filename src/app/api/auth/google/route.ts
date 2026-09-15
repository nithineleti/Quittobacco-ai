import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  OAUTH_STATE_COOKIE,
  isGoogleConfigured,
  buildGoogleAuthUrl,
} from "@/lib/auth/google";
import { baseUrl } from "@/lib/auth/url";

export const dynamic = "force-dynamic";

/**
 * Step 1 of "Sign in with Google": send the visitor to Google's consent
 * screen. A CSRF `state` value is minted and stashed in a short-lived cookie,
 * then checked again in the callback — without it, an attacker could craft a
 * link that completes Google's flow as themselves but lands the victim's
 * browser in a session the attacker controls.
 */
export async function GET() {
  if (!isGoogleConfigured()) {
    redirect("/login?error=google_not_configured");
  }

  const state = randomBytes(24).toString("base64url");
  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes — long enough to pick a Google account, no more
    path: "/",
  });

  const redirectUri = `${await baseUrl()}/api/auth/google/callback`;
  redirect(buildGoogleAuthUrl(state, redirectUri));
}
