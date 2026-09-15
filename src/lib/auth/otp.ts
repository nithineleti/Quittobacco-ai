import "server-only";

import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import {
  OTP_PURPOSE,
  consumeToken,
  createAuthToken,
  deleteTokens,
  findLiveTokensForUser,
  purgeExpiredTokens,
  type UserRow,
} from "@/lib/auth/db";
import { demoOtpFor } from "@/lib/auth/demo";

export const OTP_TTL_MINUTES = 5;
export const OTP_LENGTH = 6;

/**
 * Uniformly random, so every code is equally likely — `Math.random()` would
 * not be, and a 6-digit code has little entropy to spare.
 */
export function generateOtpCode(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

/**
 * A 6-digit code has only a million possibilities, so hashing the code alone
 * would let anyone holding a database dump recover every live code in
 * milliseconds. Mixing in the token's own random id means each row has to be
 * cracked separately — and since a code lives five minutes and dies on first
 * use, that is not a realistic attack. The real defence is online: a handful
 * of guesses per number, then the code is burned (see actions.ts).
 */
export function hashOtp(tokenId: string, code: string): string {
  return createHash("sha256").update(`${tokenId}:${code}`).digest("hex");
}

/** Constant-time comparison, so the response time can't leak how many leading digits matched. */
export function otpMatches(tokenId: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(tokenId, code), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Only ever the digits — a code pasted as "123 456" or "123-456" should still work. */
export function normalizeOtpInput(value: string): string {
  return value.replace(/\D/g, "");
}

export interface IssuedOtp {
  /** The plaintext code, to be sent (or, in development, shown). */
  code: string;
  /** True for the fixed demo code: nothing is sent and nothing is revealed. */
  demo: boolean;
}

/**
 * Issues a fresh code for `user` and burns any earlier one, so "send me a new
 * code" also means the old text can no longer be used.
 */
export async function issueOtp(user: UserRow, phone: string): Promise<IssuedOtp> {
  void purgeExpiredTokens();
  await deleteTokens(user.id, OTP_PURPOSE);

  const demoCode = demoOtpFor(phone);
  const code = demoCode ?? generateOtpCode();
  const id = randomUUID();

  await createAuthToken({
    id,
    userId: user.id,
    purpose: OTP_PURPOSE,
    channel: "sms",
    codeHash: hashOtp(id, code),
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });

  return { code, demo: demoCode != null };
}

/**
 * Checks `code` against the user's live OTP and consumes it on success.
 * A wrong code leaves the token in place — the caller's attempt counter is
 * what decides when to give up on it.
 */
export async function checkOtp(userId: string, code: string): Promise<boolean> {
  const digits = normalizeOtpInput(code);
  if (digits.length !== OTP_LENGTH) return false;

  const live = await findLiveTokensForUser(userId, OTP_PURPOSE);
  const match = live.find((row) => otpMatches(row.id, digits, row.code_hash));
  if (!match) return false;

  await consumeToken(match.id, userId, OTP_PURPOSE);
  return true;
}

/** Called when a number has burned through its guesses: nothing to guess against anymore. */
export async function burnOtp(userId: string): Promise<void> {
  await deleteTokens(userId, OTP_PURPOSE);
}
