"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import {
  bumpLoginAttempts,
  createUser,
  deleteUser,
  findUserByEmail,
  findUserByPhone,
  isUniqueViolation,
  normalizeEmail,
  recordLogin,
  resetLoginAttempts,
  updateUserLanguage,
} from "@/lib/auth/db";
import {
  assertMailerConfigured,
  passwordResetMail,
  sendMail,
} from "@/lib/auth/mailer";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  RESET_TTL_MINUTES,
  applyReset,
  createResetLink,
} from "@/lib/auth/reset";
import { createSession, deleteSession, readSession } from "@/lib/auth/session";
import {
  normalizePhone,
  validateEmail,
  validatePassword,
} from "@/lib/auth/validate";
import { LANGUAGES } from "@/i18n/languages";

export interface AuthState {
  /** Form-level error, as an i18n key. */
  error?: string;
  /** Per-field errors, as i18n keys. */
  fieldErrors?: Partial<
    Record<"email" | "password" | "confirm" | "name" | "phone", string>
  >;
  /** Echoed back so a failed submit doesn't wipe what the user typed. */
  values?: { email?: string; name?: string; phone?: string };
  /** Set when the e-mail is already registered: the UI flips to sign-in. */
  switchToSignIn?: boolean;
}

const LANG_CODES = LANGUAGES.map((l) => l.code) as readonly string[];

function safeLanguage(value: FormDataEntryValue | null): string {
  const lang = String(value ?? "en");
  return LANG_CODES.includes(lang) ? lang : "en";
}

/**
 * Only ever redirect to a path on this site. `//evil.com` is a valid relative
 * URL to a browser but an open redirect to us, hence the second check.
 */
function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? "");
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

/** Brute-force brake: 8 attempts per e-mail per 15 minutes, counted in Postgres. */
const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 8;
/** Reset e-mails are capped harder — each one lands in someone's inbox. */
const MAX_RESETS = 3;

// ---------------------------------------------------------------- sign in ---

export async function signIn(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const language = safeLanguage(formData.get("language"));
  const values = { email };

  const emailError = validateEmail(email);
  const passwordError = password ? null : "auth.errors.passwordRequired";
  if (emailError || passwordError) {
    return {
      values,
      fieldErrors: {
        ...(emailError && { email: emailError }),
        ...(passwordError && { password: passwordError }),
      },
    };
  }

  const throttleKey = `signin:${normalizeEmail(email)}`;
  const attempts = await bumpLoginAttempts(throttleKey, WINDOW_SECONDS);
  if (attempts > MAX_ATTEMPTS) {
    return { values, error: "auth.errors.tooMany" };
  }

  const user = await findUserByEmail(email);
  // Deliberately identical response for "no such user" and "wrong password",
  // so the form can't be used to discover which e-mails are registered.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { values, error: "auth.errors.badCredentials" };
  }

  await resetLoginAttempts(throttleKey);
  await recordLogin(user.id, language);
  await createSession({
    userId: user.id,
    email: user.email,
    language,
    v: user.token_version,
  });

  redirect(safeNext(formData.get("next")));
}

// ---------------------------------------------------------------- sign up ---

export async function signUp(
  _prev: AuthState | undefined,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const language = safeLanguage(formData.get("language"));
  const values = { email, name, phone: phoneRaw };

  const fieldErrors: NonNullable<AuthState["fieldErrors"]> = {};

  const emailError = validateEmail(email);
  if (emailError) fieldErrors.email = emailError;

  const passwordError = validatePassword(password);
  if (passwordError) fieldErrors.password = passwordError;
  else if (password !== confirm)
    fieldErrors.confirm = "auth.errors.confirmMismatch";

  // Phone is optional today. It is collected now so that phone + OTP sign-in
  // can be switched on later without asking existing users to re-register.
  let phone: string | undefined;
  if (phoneRaw) {
    const normalized = normalizePhone(phoneRaw);
    if (!normalized) fieldErrors.phone = "auth.errors.phoneInvalid";
    else phone = normalized;
  }

  if (Object.keys(fieldErrors).length > 0) return { values, fieldErrors };

  // The user asked for this explicitly: an e-mail that already exists should
  // send you to sign-in rather than silently failing. This does leak that the
  // address is registered — an accepted trade for a much clearer flow.
  if (await findUserByEmail(email)) {
    return { values, switchToSignIn: true, error: "auth.errors.emailTaken" };
  }

  if (phone && (await findUserByPhone(phone))) {
    return { values, fieldErrors: { phone: "auth.errors.phoneTaken" } };
  }

  const id = randomUUID();
  const passwordHash = await hashPassword(password);

  try {
    await createUser({
      id,
      email,
      passwordHash,
      displayName: name || undefined,
      phone,
      language,
    });
  } catch (err) {
    // A race between the checks above and the insert. The database constraint
    // is the real arbiter, so map its verdict back to the right field.
    if (isUniqueViolation(err, "phone")) {
      return { values, fieldErrors: { phone: "auth.errors.phoneTaken" } };
    }
    if (isUniqueViolation(err)) {
      return { values, switchToSignIn: true, error: "auth.errors.emailTaken" };
    }
    throw err;
  }

  // A brand-new account starts at token_version 0.
  await createSession({
    userId: id,
    email: normalizeEmail(email),
    language,
    v: 0,
  });

  redirect("/");
}

// ---------------------------------------------------------- password reset ---

export interface ResetState {
  /** i18n key for a form-level message. */
  error?: string;
  /** Set once the request is accepted — the UI shows the "check your inbox" state. */
  sent?: boolean;
  /** Set when a new password was saved successfully. */
  done?: boolean;
  fieldErrors?: Partial<Record<"email" | "password" | "confirm", string>>;
  values?: { email?: string };
}

/**
 * Step 1: ask for a reset link.
 *
 * Always reports success, whether or not the address exists — otherwise this
 * form becomes a way to test which e-mails are registered.
 */
export async function requestPasswordReset(
  _prev: ResetState | undefined,
  formData: FormData,
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim();
  const values = { email };

  const emailError = validateEmail(email);
  if (emailError) return { values, fieldErrors: { email: emailError } };

  // Throttle by address so this can't be used to spam someone's inbox.
  const throttleKey = `reset:${normalizeEmail(email)}`;
  if ((await bumpLoginAttempts(throttleKey, WINDOW_SECONDS)) > MAX_RESETS) {
    return { values, error: "auth.errors.tooMany" };
  }

  const user = await findUserByEmail(email);
  if (user) {
    // Fail loudly in production if mail isn't configured: a silent no-op would
    // leave the user waiting for an e-mail that is never coming.
    assertMailerConfigured();
    const link = await createResetLink(user);
    const mail = passwordResetMail(link, RESET_TTL_MINUTES);
    try {
      await sendMail({ to: user.email, ...mail });
    } catch {
      return { values, error: "auth.errors.mailFailed" };
    }
  }

  return { sent: true, values };
}

/** Step 2: set the new password using the token from the e-mailed link. */
export async function performPasswordReset(
  _prev: ResetState | undefined,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const passwordError = validatePassword(password);
  if (passwordError) return { fieldErrors: { password: passwordError } };
  if (password !== confirm)
    return { fieldErrors: { confirm: "auth.errors.confirmMismatch" } };

  if (!(await applyReset(token, password))) {
    return { error: "auth.errors.resetInvalid" };
  }

  // Every session is now invalid, including any this browser held.
  await deleteSession();
  return { done: true };
}

// --------------------------------------------------------- delete account ---

/**
 * Right to erasure. Removes the account row (tokens cascade) and signs the
 * device out. Quit data lives on the device and is cleared separately by
 * "Clear everything" in Profile.
 */
export async function deleteAccount(): Promise<void> {
  const session = await readSession();
  if (session) await deleteUser(session.userId);
  await deleteSession();
  redirect("/login");
}

// --------------------------------------------------------------- language ---

/**
 * Called from Profile when the user changes language after signing in. Writes
 * it to the account (not just the device) so the choice follows them to a new
 * phone, and refreshes the session cookie to match.
 */
export async function updateLanguage(language: string): Promise<void> {
  const session = await readSession();
  if (!session) return;

  const lang = safeLanguage(language);
  await updateUserLanguage(session.userId, lang);
  await createSession({ ...session, language: lang });
}

// --------------------------------------------------------------- sign out ---

export async function signOut(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
