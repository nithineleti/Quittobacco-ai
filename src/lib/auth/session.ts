import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "qt_session";
const MAX_AGE_DAYS = 30;

export interface SessionPayload {
  userId: string;
  email: string;
  language: string;
  /**
   * The user's token_version when this session was issued. The DAL compares it
   * against the current value, so changing a password invalidates every cookie
   * issued before the change.
   */
  v: number;
}

/**
 * In production the secret MUST come from the environment. In development we
 * persist a generated one to disk so sessions survive a dev-server restart —
 * regenerating per boot would silently log you out on every hot reload.
 */
function resolveSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is required in production (>=32 chars). Generate one with: openssl rand -base64 32",
    );
  }

  const devPath = join(process.cwd(), "data", ".session-secret");
  if (existsSync(devPath)) return readFileSync(devPath, "utf8").trim();

  const generated = randomBytes(32).toString("base64");
  mkdirSync(dirname(devPath), { recursive: true });
  writeFileSync(devPath, generated, { mode: 0o600 });
  return generated;
}

let cachedKey: Uint8Array | undefined;
function key(): Uint8Array {
  cachedKey ??= new TextEncoder().encode(resolveSecret());
  return cachedKey;
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DAYS}d`)
    .sign(key());
}

export async function decrypt(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      email: String(payload.email ?? ""),
      language: String(payload.language ?? "en"),
      v: Number(payload.v ?? 0),
    };
  } catch {
    // Expired or tampered — treat exactly like "signed out".
    return null;
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const expires = new Date(Date.now() + MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const store = await cookies();

  store.set(SESSION_COOKIE, await encrypt(payload), {
    httpOnly: true,
    // NOT `true` in dev: the app is tested on a real phone over the LAN
    // (http://192.168.x.x), which is not a secure context, so a Secure cookie
    // would be silently dropped and login would appear to do nothing.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decrypt(store.get(SESSION_COOKIE)?.value);
}
