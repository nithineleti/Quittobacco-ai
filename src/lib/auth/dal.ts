import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { findUserById, type UserRow } from "@/lib/auth/db";
import { readSession } from "@/lib/auth/session";

/**
 * The real authorization boundary. `proxy.ts` does a fast cookie-shape check to
 * keep signed-out users off protected routes, but it never touches the
 * database — anything that actually reads user data goes through here.
 *
 * `cache()` memoizes for the duration of one render pass, so a layout and three
 * children asking "who am I?" costs a single verify.
 */
export const verifySession = cache(async () => {
  const session = await readSession();
  if (!session) redirect("/login");
  return { isAuth: true as const, userId: session.userId, email: session.email };
});

/** Current user row, or redirect to /login. */
export const getCurrentUser = cache(async (): Promise<UserRow> => {
  const session = await readSession();
  if (!session) redirect("/login");

  const user = await findUserById(session.userId);
  // Session is valid but the row is gone (deleted account / db reset).
  if (!user) redirect("/login");

  // Password changed since this cookie was issued — reject it. This is what
  // makes "reset my password" actually kick out whoever else was signed in.
  if (session.v !== user.token_version) redirect("/login");

  return user;
});

/** Non-redirecting variant, for places that merely want to know. */
export const getOptionalUser = cache(async (): Promise<UserRow | null> => {
  const session = await readSession();
  if (!session) return null;
  const user = await findUserById(session.userId);
  if (!user || session.v !== user.token_version) return null;
  return user;
});
