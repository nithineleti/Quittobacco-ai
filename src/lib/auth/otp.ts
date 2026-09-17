import "server-only";

import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import {
  OTP_PURPOSE,
  PHONE_VERIFY_PURPOSE,
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
 * Issues a fresh code for one purpose and burns any earlier one of the same
 * purpose, so "send me a new code" also means the old text can no longer be
 * used. `payload` rides along on the row for the caller to read back.
 */
async function issueCode(input: {
  userId: string;
  purpose: string;
  phone: string;
  payload?: string;
}): Promise<IssuedOtp> {
  void purgeExpiredTokens();
  await deleteTokens(input.userId, input.purpose);

  const demoCode = demoOtpFor(input.phone);
  const code = demoCode ?? generateOtpCode();
  const id = randomUUID();

  await createAuthToken({
    id,
    userId: input.userId,
    purpose: input.purpose,
    channel: "sms",
    codeHash: hashOtp(id, code),
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    payload: input.payload,
  });

  return { code, demo: demoCode != null };
}

/**
 * Finds the user's live code of `purpose` matching `code` and consumes it.
 * A wrong code leaves the token in place — the caller's attempt counter is
 * what decides when to give up on it.
 */
async function consumeMatching(
  userId: string,
  purpose: string,
  code: string,
): Promise<{ payload: string | null } | null> {
  const digits = normalizeOtpInput(code);
  if (digits.length !== OTP_LENGTH) return null;

  const live = await findLiveTokensForUser(userId, purpose);
  const match = live.find((row) => otpMatches(row.id, digits, row.code_hash));
  if (!match) return null;

  await consumeToken(match.id, userId, purpose);
  return { payload: match.payload };
}

// ---------------------------------------------------------------- sign in ---

export function issueOtp(user: UserRow, phone: string): Promise<IssuedOtp> {
  return issueCode({ userId: user.id, purpose: OTP_PURPOSE, phone });
}

export async function checkOtp(userId: string, code: string): Promise<boolean> {
  return (await consumeMatching(userId, OTP_PURPOSE, code)) !== null;
}

/** Called when a number has burned through its guesses: nothing to guess against anymore. */
export async function burnOtp(userId: string): Promise<void> {
  await deleteTokens(userId, OTP_PURPOSE);
}

// ----------------------------------------------- verify a number (Profile) ---

/**
 * A code for a number the signed-in user wants on their account. The number
 * is stored on the token, not trusted from the confirm form: the code was
 * texted to THIS number, so it can only ever verify this number.
 */
export function issuePhoneVerification(
  userId: string,
  phone: string,
): Promise<IssuedOtp> {
  return issueCode({ userId, purpose: PHONE_VERIFY_PURPOSE, phone, payload: phone });
}

/** Returns the verified number on success, null on a wrong or expired code. */
export async function checkPhoneVerification(
  userId: string,
  code: string,
): Promise<string | null> {
  const hit = await consumeMatching(userId, PHONE_VERIFY_PURPOSE, code);
  return hit?.payload ?? null;
}

export async function burnPhoneVerification(userId: string): Promise<void> {
  await deleteTokens(userId, PHONE_VERIFY_PURPOSE);
}
