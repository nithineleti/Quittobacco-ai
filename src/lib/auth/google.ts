import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * "Sign in with Google" — the OAuth 2.0 Authorization Code flow, hand-rolled
 * rather than pulled in via a library. The app already has its own session and
 * cookie handling (session.ts); a full auth framework would duplicate that
 * rather than plug into it, for one extra provider.
 *
 * The ID token's signature is verified against Google's published keys via
 * `jose`, already a dependency for our own session JWTs — `createRemoteJWKSet`
 * fetches and caches them, so this never hardcodes a key.
 */

/**
 * Lives here rather than in the route file that sets it: a route.ts should
 * only export the HTTP method handlers Next recognises there, so a shared
 * constant belongs in the plain module both routes already import from.
 */
export const OAUTH_STATE_COOKIE = "qt_oauth_state";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID is not set");
  return id;
}

export function buildGoogleAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    // Lets a user on a shared device pick which Google account, rather than
    // silently reusing whichever one is already signed into the browser.
    prompt: "select_account",
    // We only need identity, once, at sign-in — no refresh token, no
    // standing access to the visitor's Google account.
    access_type: "online",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

interface GoogleIdentity {
  email: string;
  emailVerified: boolean;
  name?: string;
}

/**
 * Exchanges the authorization code for tokens and returns the verified
 * identity from the ID token. Throws on any failure — the caller treats that
 * uniformly as "Google sign-in failed."
 */
export async function resolveGoogleIdentity(
  code: string,
  redirectUri: string,
): Promise<GoogleIdentity> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status})`);
  }

  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) throw new Error("Google response had no id_token");

  // Verifies the signature against Google's live public keys, and pins the
  // issuer/audience so a token minted for a different app can't be replayed
  // against this one.
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: googleClientId(),
  });

  const email = typeof payload.email === "string" ? payload.email : "";
  if (!email) throw new Error("Google identity had no email");

  return {
    email,
    // Google can issue a token for an unverified address (e.g. before the
    // user finishes verifying a new Google Workspace account). Treat that as
    // untrustworthy for sign-in — the whole point of using Google is that the
    // email is proven.
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : undefined,
  };
}
