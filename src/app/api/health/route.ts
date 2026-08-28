import { checkDatabase } from "@/lib/auth/db";

export const dynamic = "force-dynamic";

/**
 * Deployment self-check.
 *
 * Exists because a misconfigured deploy is otherwise indistinguishable from a
 * broken one: every page just shows the error boundary. This says which piece
 * is missing.
 *
 * It reports only presence and reachability — never a secret's value, and never
 * the connection string. The most it reveals is which environment variable
 * name was found, which tells an attacker nothing they couldn't guess.
 */
export async function GET() {
  const db = await checkDatabase();

  // In development the secret is auto-generated to disk, so the env var being
  // absent is not a fault. In production it is required and the app throws
  // without it, so only the real variable counts.
  const isProd = process.env.NODE_ENV === "production";
  const hasSecretVar = Boolean(
    process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32,
  );
  const sessionSecret = isProd ? hasSecretVar : true;
  const mail = Boolean(process.env.RESEND_API_KEY);
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .filter((e) => e.trim()).length;

  // Sign-in and sign-up need both of these. Mail is only needed for reset.
  const ready = db.ok && sessionSecret;

  const body = {
    ready,
    checks: {
      database: db,
      sessionSecret: {
        ok: sessionSecret,
        hint: sessionSecret
          ? isProd
            ? undefined
            : "dev: auto-generated to data/.session-secret"
          : "Set SESSION_SECRET (32+ chars): openssl rand -base64 32",
      },
      mail: {
        ok: mail,
        hint: mail ? undefined : "Set RESEND_API_KEY to enable password reset",
      },
      adminEmails: { ok: admins > 0, count: admins },
    },
  };

  return Response.json(body, {
    status: ready ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
