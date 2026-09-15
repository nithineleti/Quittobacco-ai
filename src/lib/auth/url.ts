import "server-only";

import { headers } from "next/headers";

/**
 * Absolute base URL of this deployment. Shared by the password-reset e-mail
 * links and the Google OAuth redirect URI — both need the real public origin,
 * not whatever host a proxy or preview happens to answer on.
 */
export async function baseUrl(): Promise<string> {
  // APP_URL wins — it is the only one that knows about a custom domain.
  const explicit = process.env.APP_URL ?? process.env.URL; // URL is set by Netlify
  if (explicit) return explicit.replace(/\/$/, "");

  // Vercel exposes bare hostnames, no protocol. Prefer the stable production
  // host over VERCEL_URL, which is per-deployment: a link generated from a
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
