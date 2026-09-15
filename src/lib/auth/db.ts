import "server-only";

import { randomUUID } from "node:crypto";
import { Pool } from "pg";

/**
 * The account store. Deliberately the ONLY stateful server dependency in the
 * app — everything else still lives on the device (see README).
 *
 * Postgres, not SQLite: the app deploys to Netlify, where SSR runs in
 * serverless functions with a read-only, per-instance filesystem. A SQLite file
 * there either fails to open or silently gives each function instance its own
 * database. Works with any Postgres — Netlify DB / Neon in production, a local
 * server in development.
 */

/**
 * Connection string, accepting whatever name the host injects.
 *
 * Vercel Marketplace databases (Neon, Supabase, Prisma Postgres) are wired up
 * automatically, but each provider names the variable differently — Neon sets
 * DATABASE_URL, Supabase and others use POSTGRES_URL. Reading several avoids a
 * deploy that builds fine and then 500s because the variable was spelled the
 * other way.
 *
 * Pooled URLs come first: serverless functions open and drop connections
 * constantly, and an unpooled endpoint exhausts the database's slots.
 */
const CONNECTION_VARS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "DATABASE_POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
] as const;

function resolveConnectionString(): string | undefined {
  for (const name of CONNECTION_VARS) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

const connectionString = resolveConnectionString();

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Managed Postgres (Neon, Netlify DB, Supabase) requires TLS; a local server
 * usually has none and errors on the attempt. An explicit `sslmode` in the URL
 * always wins — parsed rather than pattern-matched, so a URL with no
 * credentials (`postgres://localhost:5432/db`) is read correctly.
 */
function wantsSsl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const mode = parsed.searchParams.get("sslmode");
    if (mode === "disable") return false;
    if (mode) return true;
    return !LOCAL_HOSTS.has(parsed.hostname);
  } catch {
    // Unparseable — assume a managed host and keep TLS on.
    return true;
  }
}

function createPool(): Pool {
  if (!connectionString) {
    throw new Error(
      `No Postgres connection string found. Set one of: ${CONNECTION_VARS.join(", ")}. ` +
        "On Vercel, provisioning a Marketplace database (`vercel install neon`) " +
        "injects this automatically. Locally: " +
        "postgres://localhost:5432/quittobacco_dev",
    );
  }

  return new Pool({
    connectionString,
    // Verify the server certificate. `rejectUnauthorized: false` would accept
    // ANY cert, so anything able to intercept the connection could read the
    // e-mails and password hashes crossing it. Neon, Netlify DB and Supabase
    // all present certs signed by public CAs, so verification just works.
    // PGSSL_NO_VERIFY exists only for a self-signed server you control.
    ssl: wantsSsl(connectionString)
      ? { rejectUnauthorized: process.env.PGSSL_NO_VERIFY !== "1" }
      : undefined,
    // Serverless functions are short-lived and numerous — keep each instance's
    // pool tiny and let the platform's connection pooler do the real work.
    // Use the POOLED connection string on Neon (the `-pooler` host).
    max: Number(process.env.PGPOOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
}

// Dev hot-reload re-evaluates modules; without this we'd leak a pool per edit.
const globalForDb = globalThis as unknown as {
  __authPool?: Pool;
  __authSchema?: Promise<void>;
};

function pool(): Pool {
  globalForDb.__authPool ??= createPool();
  return globalForDb.__authPool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  language      TEXT NOT NULL DEFAULT 'en',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- Bumped on every password change. Sessions carry the value they were issued
-- with, so a reset instantly invalidates cookies held anywhere else — which is
-- the whole point of resetting a password you think someone else knows.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- Operator access to the backend dashboard, which exposes EVERY user's data.
-- Defaults to false: it must be granted deliberately, never inherited by
-- ordinary sign-up.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Google-created accounts have no password to hash. Idempotent: running this
-- against an already-nullable column is a silent no-op, so it is safe to leave
-- in the schema that runs on every cold start.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Reserved for the OTP work (phone sign-in, e-mailed password reset). The
-- table exists now so adding delivery later is a feature, not a migration.
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL,
  channel     TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tokens_user ON auth_tokens(user_id, purpose);
-- Reset links are looked up by their hash, so that lookup must be indexed.
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON auth_tokens(code_hash);

-- The user's quit journey, mirrored from the device.
--
-- Stored as a JSONB document rather than one table per concept (check-ins,
-- scans, rewards...). The shape IS the client's persisted state, it evolves
-- with the client, and nothing queries across users — normalising it would buy
-- migrations and joins we have no use for. Revisit if a real cross-patient
-- clinician dashboard is ever built.
CREATE TABLE IF NOT EXISTS user_state (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state      JSONB NOT NULL,
  -- The DEVICE's modification time, not the server's. Conflict resolution is
  -- last-write-wins, and the device is where writes actually happen.
  updated_at TIMESTAMPTZ NOT NULL,
  revision   INTEGER NOT NULL DEFAULT 1
);

-- Brute-force throttle. Lives in the database, not process memory: serverless
-- functions are recycled constantly, and an in-memory counter resets with them,
-- so an attacker only has to wait out a cold start.
CREATE TABLE IF NOT EXISTS login_attempts (
  id           TEXT PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit trail of every sign-in and sign-up attempt, successful or not. This is
-- the real, honest answer to "see login credentials in a dashboard": no
-- plaintext password is ever stored anywhere (see password.ts), so there is
-- nothing to show for the credential itself — but every USE of one is logged
-- here and visible on /backend.
--
-- user_id is nullable and ON DELETE SET NULL, deliberately: deleting an
-- account must not delete its audit history.
CREATE TABLE IF NOT EXISTS login_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  email      TEXT NOT NULL,
  method     TEXT NOT NULL,
  action     TEXT NOT NULL,
  success    BOOLEAN NOT NULL,
  reason     TEXT,
  ip         TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_events_created ON login_events(created_at DESC);

-- The Patient ID a clinician reads off a patient's phone to find them in the
-- admin panel. A short, sequential number rather than the UUID primary key:
-- "QT-000042" can be said aloud across a desk and typed without error, which
-- a 36-character UUID cannot. Existing rows are numbered on the ALTER, in
-- creation order (Postgres evaluates a volatile default once per row).
CREATE SEQUENCE IF NOT EXISTS users_patient_no_seq;
ALTER TABLE users ADD COLUMN IF NOT EXISTS patient_no INTEGER NOT NULL DEFAULT nextval('users_patient_no_seq');
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_patient_no ON users(patient_no);

-- Reports, images and documents a clinician sends to ONE patient. Only an
-- operator can write here (document-actions.ts); a patient can only read
-- their own rows (api/documents). Bytes live in the row: the app's single
-- stateful dependency stays Postgres, the file is covered by the same backups
-- as the account, and nothing needs a second bucket with its own access
-- policy. Files are capped at 4 MB for exactly this reason.
--
-- user_id cascades: a deleted account takes its documents with it, which is
-- what "delete my account" must mean for medical material. uploaded_by does
-- not: the document outlives the operator who sent it.
CREATE TABLE IF NOT EXISTS patient_documents (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  kind        TEXT NOT NULL,
  note        TEXT,
  file_name   TEXT NOT NULL,
  mime        TEXT NOT NULL,
  size_bytes  INTEGER NOT NULL,
  data        BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- When the PATIENT first opened it. Drives the "new" badge in the app.
  seen_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_patient_documents_user ON patient_documents(user_id, created_at DESC);
`;

/**
 * Idempotent, and memoized per process so it costs one round-trip per cold
 * start rather than one per query. Fine at this scale; a larger schema would
 * move to a migration step in the deploy pipeline instead.
 */
function ensureSchema(): Promise<void> {
  globalForDb.__authSchema ??= pool()
    .query(SCHEMA)
    .then(() => undefined)
    .catch((err) => {
      // Don't cache a failure — the next request should be able to retry.
      globalForDb.__authSchema = undefined;
      throw err;
    });
  return globalForDb.__authSchema;
}

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const result = await pool().query(sql, params);
  return result.rows as T[];
}

/**
 * Connectivity probe for the health endpoint. Returns which variable supplied
 * the connection string — the NAME only, never the value — and whether a
 * trivial query succeeds.
 */
export async function checkDatabase(): Promise<{
  ok: boolean;
  variable?: string;
  error?: string;
  hint?: string;
}> {
  const variable = CONNECTION_VARS.find((n) => process.env[n]);
  if (!variable) {
    return {
      ok: false,
      error: "no connection string",
      hint: `Set one of: ${CONNECTION_VARS.join(", ")}. On Vercel: Storage -> Create Database -> Neon.`,
    };
  }
  try {
    await query("SELECT 1");
    return { ok: true, variable };
  } catch (err) {
    // The message can contain the host, so keep it short and never echo the URL.
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, variable, error: message.slice(0, 120) };
  }
}

export interface UserRow {
  id: string;
  email: string;
  phone: string | null;
  /** Null for an account created via Google — see google.ts. */
  password_hash: string | null;
  display_name: string | null;
  language: string;
  created_at: string;
  last_login_at: string | null;
  token_version: number;
  is_admin: boolean;
  /** Sequential Patient ID — display with formatPatientCode(). */
  patient_no: number;
}

export interface AuthTokenRow {
  id: string;
  user_id: string;
  purpose: string;
  channel: string;
  code_hash: string;
  expires_at: string;
  consumed_at: string | null;
}

/** Postgres error code for a unique-constraint violation. */
export const UNIQUE_VIOLATION = "23505";
/** Raised when a row references a user that no longer exists. */
export const FOREIGN_KEY_VIOLATION = "23503";

/** True when `err` is a unique violation, optionally on a specific column. */
export function isUniqueViolation(err: unknown, column?: string): boolean {
  const e = err as { code?: string; constraint?: string; detail?: string };
  if (e?.code !== UNIQUE_VIOLATION) return false;
  if (!column) return true;
  return Boolean(
    e.constraint?.includes(column) || e.detail?.includes(`(${column})`),
  );
}

/** Emails are matched case-insensitively; we store and compare the lowercased form. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(
  email: string,
): Promise<UserRow | undefined> {
  const rows = await query<UserRow>("SELECT * FROM users WHERE email = $1", [
    normalizeEmail(email),
  ]);
  return rows[0];
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const rows = await query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0];
}

export async function findUserByPhone(
  phone: string,
): Promise<UserRow | undefined> {
  const rows = await query<UserRow>("SELECT * FROM users WHERE phone = $1", [
    phone,
  ]);
  return rows[0];
}

export async function createUser(input: {
  id: string;
  email: string;
  /** Null for a Google-created account — there is no password to hash. */
  passwordHash: string | null;
  displayName?: string;
  phone?: string;
  language: string;
}): Promise<UserRow> {
  const rows = await query<UserRow>(
    `INSERT INTO users (id, email, phone, password_hash, display_name, language)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.id,
      normalizeEmail(input.email),
      input.phone ?? null,
      input.passwordHash,
      input.displayName ?? null,
      input.language,
    ],
  );
  return rows[0];
}

export async function recordLogin(
  id: string,
  language?: string,
): Promise<void> {
  if (language) {
    await query(
      "UPDATE users SET last_login_at = now(), language = $2 WHERE id = $1",
      [id, language],
    );
    return;
  }
  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [id]);
}

/**
 * Counts one attempt against `key` and returns the running total for the
 * current window. A single statement, so concurrent requests can't race past
 * the limit. Returns 0 if the throttle itself fails — the password check is
 * still the real gate, and a broken counter must not lock everyone out.
 */
export async function bumpLoginAttempts(
  key: string,
  windowSeconds: number,
): Promise<number> {
  const interval = `${Math.max(1, Math.floor(windowSeconds))} seconds`;
  try {
    const rows = await query<{ count: number }>(
      `INSERT INTO login_attempts (id, count, window_start)
       VALUES ($1, 1, now())
       ON CONFLICT (id) DO UPDATE SET
         count = CASE
           WHEN login_attempts.window_start < now() - $2::interval THEN 1
           ELSE login_attempts.count + 1
         END,
         window_start = CASE
           WHEN login_attempts.window_start < now() - $2::interval THEN now()
           ELSE login_attempts.window_start
         END
       RETURNING count`,
      [key, interval],
    );
    return rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

/** Clears the throttle after a successful sign-in. */
export async function resetLoginAttempts(key: string): Promise<void> {
  try {
    await query("DELETE FROM login_attempts WHERE id = $1", [key]);
  } catch {
    // Non-fatal: the row ages out of its window on its own.
  }
}

// ------------------------------------------------------------------ admin ---

/** One row per user for the dashboard list. Never includes password_hash. */
export interface AdminUserRow {
  id: string;
  patient_no: number;
  email: string;
  display_name: string | null;
  phone: string | null;
  language: string;
  is_admin: boolean;
  created_at: string;
  last_login_at: string | null;
  synced_at: string | null;
  state: unknown | null;
  /** Reports/images/documents the clinic has sent this patient. */
  documents: number;
}

const ADMIN_USER_SELECT = `
  SELECT u.id, u.patient_no, u.email, u.display_name, u.phone, u.language,
         u.is_admin, u.created_at, u.last_login_at,
         s.updated_at AS synced_at, s.state,
         (SELECT count(*) FROM patient_documents d WHERE d.user_id = u.id)::int AS documents
    FROM users u
    LEFT JOIN user_state s ON s.user_id = u.id`;

/**
 * Every user with their journey, for the operator dashboard.
 *
 * `password_hash` is deliberately never selected. It is a one-way scrypt hash —
 * there is no plaintext password to show anyone, by design.
 */
export async function listAllUsers(): Promise<AdminUserRow[]> {
  return query<AdminUserRow>(`${ADMIN_USER_SELECT} ORDER BY u.created_at DESC`);
}

/** One patient, for the admin panel's per-patient page. */
export async function getAdminUser(id: string): Promise<AdminUserRow | undefined> {
  const rows = await query<AdminUserRow>(`${ADMIN_USER_SELECT} WHERE u.id = $1`, [id]);
  return rows[0];
}

export async function countAuthTokens(): Promise<number> {
  const rows = await query<{ n: string }>(
    "SELECT count(*) AS n FROM auth_tokens WHERE consumed_at IS NULL AND expires_at > now()",
  );
  return Number(rows[0]?.n ?? 0);
}

/** Grants or revokes operator access. */
export async function setAdmin(userId: string, isAdmin: boolean): Promise<void> {
  await query("UPDATE users SET is_admin = $2 WHERE id = $1", [userId, isAdmin]);
}

// -------------------------------------------------------------- user state ---

export interface UserStateRow {
  state: unknown;
  updated_at: string;
  revision: number;
}

export async function loadUserState(
  userId: string,
): Promise<UserStateRow | undefined> {
  const rows = await query<UserStateRow>(
    "SELECT state, updated_at, revision FROM user_state WHERE user_id = $1",
    [userId],
  );
  return rows[0];
}

/**
 * Upsert, but only if the incoming device timestamp is newer than what is
 * stored. Doing the comparison inside the statement means two devices racing
 * can't have the older one land last and clobber the newer.
 */
export async function saveUserState(
  userId: string,
  state: unknown,
  updatedAt: string,
): Promise<{ stored: boolean; updated_at: string }> {
  const rows = await query<{ updated_at: string; stored: boolean }>(
    `INSERT INTO user_state (user_id, state, updated_at, revision)
     VALUES ($1, $2::jsonb, $3::timestamptz, 1)
     ON CONFLICT (user_id) DO UPDATE SET
       state      = CASE WHEN EXCLUDED.updated_at > user_state.updated_at
                         THEN EXCLUDED.state ELSE user_state.state END,
       revision   = CASE WHEN EXCLUDED.updated_at > user_state.updated_at
                         THEN user_state.revision + 1 ELSE user_state.revision END,
       updated_at = GREATEST(user_state.updated_at, EXCLUDED.updated_at)
     RETURNING updated_at, (updated_at = $3::timestamptz) AS stored`,
    [userId, JSON.stringify(state), updatedAt],
  );
  return { stored: rows[0]?.stored ?? false, updated_at: rows[0]?.updated_at };
}

/**
 * Wipes a user's synced journey. Used only for the demo account, so every
 * sign-in starts the questionnaire from scratch — see isDemoEmail().
 */
export async function deleteUserState(userId: string): Promise<void> {
  await query("DELETE FROM user_state WHERE user_id = $1", [userId]);
}

/** Language is account-level, so the choice follows the user to a new device. */
export async function updateUserLanguage(
  id: string,
  language: string,
): Promise<void> {
  await query("UPDATE users SET language = $2 WHERE id = $1", [id, language]);
}

/**
 * Sets a new password AND bumps token_version, so every session issued before
 * this moment stops validating. These must move together — changing one without
 * the other either leaves a stolen session alive or logs people out for nothing.
 */
export async function updatePassword(
  id: string,
  passwordHash: string,
): Promise<void> {
  await query(
    "UPDATE users SET password_hash = $2, token_version = token_version + 1 WHERE id = $1",
    [id, passwordHash],
  );
}

/** Full erasure. auth_tokens cascade via their foreign key. */
export async function deleteUser(id: string): Promise<void> {
  await query("DELETE FROM users WHERE id = $1", [id]);
}

// ------------------------------------------------------------ reset tokens ---

export const RESET_PURPOSE = "password_reset";
/** One-time sign-in code texted to `users.phone` — see otp.ts. */
export const OTP_PURPOSE = "phone_otp";

export async function createAuthToken(input: {
  id: string;
  userId: string;
  purpose: string;
  channel: string;
  codeHash: string;
  expiresAt: Date;
}): Promise<void> {
  await query(
    `INSERT INTO auth_tokens (id, user_id, purpose, channel, code_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.id,
      input.userId,
      input.purpose,
      input.channel,
      input.codeHash,
      input.expiresAt.toISOString(),
    ],
  );
}

/** Only ever returns a token that is unconsumed and unexpired. */
export async function findLiveToken(
  codeHash: string,
  purpose: string,
): Promise<AuthTokenRow | undefined> {
  const rows = await query<AuthTokenRow>(
    `SELECT * FROM auth_tokens
     WHERE code_hash = $1 AND purpose = $2
       AND consumed_at IS NULL AND expires_at > now()`,
    [codeHash, purpose],
  );
  return rows[0];
}

/**
 * A user's unconsumed, unexpired tokens of one purpose. OTPs are looked up
 * this way rather than by hash: the hash is salted with the row id, so the
 * caller has to fetch the candidates and check each one (otp.ts).
 */
export async function findLiveTokensForUser(
  userId: string,
  purpose: string,
): Promise<AuthTokenRow[]> {
  return query<AuthTokenRow>(
    `SELECT * FROM auth_tokens
     WHERE user_id = $1 AND purpose = $2
       AND consumed_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC`,
    [userId, purpose],
  );
}

/** Drops every outstanding token of one purpose — issuing a new OTP, or giving up on one. */
export async function deleteTokens(userId: string, purpose: string): Promise<void> {
  await query(
    `DELETE FROM auth_tokens
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [userId, purpose],
  );
}

/**
 * Marks the used token consumed and drops the user's other outstanding tokens
 * of the same purpose, so an older reset e-mail can't be replayed afterwards.
 */
export async function consumeToken(
  tokenId: string,
  userId: string,
  purpose: string,
): Promise<void> {
  await query("UPDATE auth_tokens SET consumed_at = now() WHERE id = $1", [
    tokenId,
  ]);
  await query(
    `DELETE FROM auth_tokens
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [userId, purpose],
  );
}

/** Housekeeping so the table doesn't grow without bound. */
export async function purgeExpiredTokens(): Promise<void> {
  try {
    await query("DELETE FROM auth_tokens WHERE expires_at < now() - interval '1 day'");
  } catch {
    // Non-fatal.
  }
}

// --------------------------------------------------------------- audit log ---

export interface LoginEventInput {
  userId: string | null;
  email: string;
  method: "password" | "google" | "otp";
  action: "sign_in" | "sign_up";
  success: boolean;
  reason?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Records one sign-in or sign-up attempt. Best-effort: a failed insert must
 * never block the auth flow it is trying to observe, so this swallows its own
 * errors rather than throwing — same fail-open shape as bumpLoginAttempts.
 */
export async function logLoginEvent(input: LoginEventInput): Promise<void> {
  try {
    await query(
      `INSERT INTO login_events
         (id, user_id, email, method, action, success, reason, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        input.userId,
        normalizeEmail(input.email),
        input.method,
        input.action,
        input.success,
        input.reason ?? null,
        input.ip ?? null,
        input.userAgent ?? null,
      ],
    );
  } catch (err) {
    console.error("logLoginEvent failed", err);
  }
}

export interface LoginEventRow {
  id: string;
  user_id: string | null;
  email: string;
  method: string;
  action: string;
  success: boolean;
  reason: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  display_name: string | null;
}

/** Most recent events first, for the operator dashboard. */
export async function listLoginEvents(limit = 200): Promise<LoginEventRow[]> {
  return query<LoginEventRow>(
    `SELECT e.*, u.display_name
       FROM login_events e
       LEFT JOIN users u ON u.id = e.user_id
      ORDER BY e.created_at DESC
      LIMIT $1`,
    [limit],
  );
}

// ------------------------------------------------------- patient documents ---

export type DocumentKind = "report" | "image" | "document";

/** Everything about a document EXCEPT its bytes — what lists render. */
export interface PatientDocumentMeta {
  id: string;
  user_id: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  title: string;
  kind: DocumentKind;
  note: string | null;
  file_name: string;
  mime: string;
  size_bytes: number;
  created_at: string;
  seen_at: string | null;
}

export interface PatientDocumentRow extends PatientDocumentMeta {
  data: Buffer;
}

const DOCUMENT_META_SELECT = `
  SELECT d.id, d.user_id, d.uploaded_by, d.title, d.kind, d.note, d.file_name,
         d.mime, d.size_bytes, d.created_at, d.seen_at,
         a.display_name AS uploaded_by_name
    FROM patient_documents d
    LEFT JOIN users a ON a.id = d.uploaded_by`;

export async function createPatientDocument(input: {
  userId: string;
  uploadedBy: string;
  title: string;
  kind: DocumentKind;
  note?: string;
  fileName: string;
  mime: string;
  data: Buffer;
}): Promise<string> {
  const id = randomUUID();
  await query(
    `INSERT INTO patient_documents
       (id, user_id, uploaded_by, title, kind, note, file_name, mime, size_bytes, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      input.userId,
      input.uploadedBy,
      input.title,
      input.kind,
      input.note ?? null,
      input.fileName,
      input.mime,
      input.data.byteLength,
      input.data,
    ],
  );
  return id;
}

/** Newest first. Metadata only — the bytes are fetched one at a time on open. */
export async function listPatientDocuments(
  userId: string,
): Promise<PatientDocumentMeta[]> {
  return query<PatientDocumentMeta>(
    `${DOCUMENT_META_SELECT} WHERE d.user_id = $1 ORDER BY d.created_at DESC`,
    [userId],
  );
}

/** The whole row including bytes, for the download route. */
export async function getPatientDocument(
  id: string,
): Promise<PatientDocumentRow | undefined> {
  const rows = await query<PatientDocumentRow>(
    `${DOCUMENT_META_SELECT.replace("SELECT d.id,", "SELECT d.data, d.id,")} WHERE d.id = $1`,
    [id],
  );
  return rows[0];
}

export async function deletePatientDocument(id: string): Promise<void> {
  await query("DELETE FROM patient_documents WHERE id = $1", [id]);
}

/** First open by the patient. Idempotent: never moves an existing timestamp. */
export async function markDocumentSeen(id: string): Promise<void> {
  await query(
    "UPDATE patient_documents SET seen_at = now() WHERE id = $1 AND seen_at IS NULL",
    [id],
  );
}

export async function countUnseenDocuments(userId: string): Promise<number> {
  const rows = await query<{ n: string }>(
    "SELECT count(*) AS n FROM patient_documents WHERE user_id = $1 AND seen_at IS NULL",
    [userId],
  );
  return Number(rows[0]?.n ?? 0);
}

export async function countAllDocuments(): Promise<number> {
  const rows = await query<{ n: string }>("SELECT count(*) AS n FROM patient_documents");
  return Number(rows[0]?.n ?? 0);
}
