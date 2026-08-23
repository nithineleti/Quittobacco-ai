import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import type { UserRow } from "@/lib/auth/db";

/**
 * Authorization for the backend dashboard, which exposes every user's account
 * and quit journey. Ordinary sign-in is nowhere near enough.
 *
 * Two ways to be an operator:
 *  - `users.is_admin` set in the database, or
 *  - the address listed in ADMIN_EMAILS, which exists so the FIRST operator can
 *    get in on a fresh deploy without hand-editing the database.
 */
function allowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: UserRow): boolean {
  return user.is_admin || allowlist().includes(user.email.toLowerCase());
}

/**
 * Returns the operator, or 404s.
 *
 * 404 rather than 403 on purpose: a "forbidden" reply confirms the dashboard
 * exists and is worth attacking. To a non-operator the route simply isn't there.
 */
export const requireAdmin = cache(async (): Promise<UserRow> => {
  const user = await getCurrentUser(); // redirects to /login when signed out
  if (!isAdminUser(user)) notFound();
  return user;
});

/** Non-throwing check, for hiding links a user can't use. */
export const viewerIsAdmin = cache(async (): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    return isAdminUser(user);
  } catch {
    return false;
  }
});
