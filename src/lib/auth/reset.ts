import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import {
  RESET_PURPOSE,
  consumeToken,
  createAuthToken,
  findLiveToken,
  findUserById,
  purgeExpiredTokens,
  updatePassword,
  type UserRow,
} from "@/lib/auth/db";
import { hashPassword } from "@/lib/auth/password";

export const RESET_TTL_MINUTES = 30;

/**
 * The raw token goes in the e-mail; only its SHA-256 is stored. A leaked
 * database therefore yields no usable reset links. SHA-256 (not scrypt) is
 * correct here: the token is 256 bits of entropy, so it isn't brute-forceable
 * and doesn't need a slow hash the way a human-chosen password does.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Absolute base URL for links in e-mail. */
async function baseUrl(): Promise<string> {
  // APP_URL wins — it is the only one that knows about a custom domain.
  const explicit = process.env.APP_URL ?? process.env.URL; // URL is set by Netlify
  if (explicit) return explicit.replace(/\/$/, "");

  // Vercel exposes bare hostnames, no protocol. Prefer the stable production
  // host over VERCEL_URL, which is per-deployment: a reset e-mail sent from a
  // preview build should still point at the real site.
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;

  // Otherwise trust the incoming request's own host.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Creates a single-use reset token and returns the link to e-mail. */
export async function createResetLink(user: UserRow): Promise<string> {
  void purgeExpiredTokens();

  const token = randomBytes(32).toString("base64url");
  await createAuthToken({
    id: randomUUID(),
    userId: user.id,
    purpose: RESET_PURPOSE,
    channel: "email",
    codeHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
  });

  return `${await baseUrl()}/reset?token=${encodeURIComponent(token)}`;
}

export type ResetCheck =
  | { ok: true; user: UserRow; tokenId: string }
  | { ok: false };

/** Validates a raw token from a link without consuming it. */
export async function checkResetToken(token: string): Promise<ResetCheck> {
  if (!token) return { ok: false };

  const row = await findLiveToken(hashToken(token), RESET_PURPOSE);
  if (!row) return { ok: false };

  const user = await findUserById(row.user_id);
  if (!user) return { ok: false };

  return { ok: true, user, tokenId: row.id };
}

/**
 * Applies the new password and burns the token. Re-checks the token rather than
 * trusting the caller, so the window between rendering the form and submitting
 * it can't be used to reset with an already-consumed link.
 */
export async function applyReset(
  token: string,
  newPassword: string,
): Promise<boolean> {
  const check = await checkResetToken(token);
  if (!check.ok) return false;

  // updatePassword also bumps token_version, killing every existing session.
  await updatePassword(check.user.id, await hashPassword(newPassword));
  await consumeToken(check.tokenId, check.user.id, RESET_PURPOSE);
  return true;
}
