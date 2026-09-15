"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  bumpLoginAttempts,
  createUser,
  deleteUser,
  deleteUserState,
  findUserByEmail,
  findUserByPhone,
  isUniqueViolation,
  logLoginEvent,
  normalizeEmail,
  recordLogin,
  resetLoginAttempts,
  updateUserLanguage,
} from "@/lib/auth/db";
import { isDemoEmail } from "@/lib/auth/demo";
import {
  assertMailerConfigured,
  passwordResetMail,
  sendMail,
} from "@/lib/auth/mailer";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  OTP_LENGTH,
  OTP_TTL_MINUTES,
  burnOtp,
  checkOtp,
  issueOtp,
  normalizeOtpInput,
} from "@/lib/auth/otp";
import {
  RESET_TTL_MINUTES,
  applyReset,
  createResetLink,
} from "@/lib/auth/reset";
import { createSession, deleteSession, readSession } from "@/lib/auth/session";
import { otpSms, revealsOtp, sendSms } from "@/lib/auth/sms";
import { baseUrl } from "@/lib/auth/url";
import {
  formatPhone,
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
/** OTP texts likewise: each costs money and lands on someone's phone. */
const MAX_OTP_SENDS = 3;
/**
 * Guesses at a 6-digit code. Five wrong tries then the code is burned, so a
 * million-guess sweep is impossible no matter how patient the attacker is.
 */
const MAX_OTP_GUESSES = 5;

/** IP and device, for the login audit log — never used for an access decision. */
async function requestMeta(): Promise<{ ip?: string; userAgent?: string }> {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: h.get("user-agent") ?? undefined,
  };
}

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

  const meta = await requestMeta();
  const throttleKey = `signin:${normalizeEmail(email)}`;
  const attempts = await bumpLoginAttempts(throttleKey, WINDOW_SECONDS);
  if (attempts > MAX_ATTEMPTS) {
    await logLoginEvent({
      userId: null,
      email,
      method: "password",
      action: "sign_in",
      success: false,
      reason: "too_many_attempts",
      ...meta,
    });
    return { values, error: "auth.errors.tooMany" };
  }

  const user = await findUserByEmail(email);
  // A Google-created account has no password to check — reject it exactly
  // like a wrong password would be, rather than throwing on the null hash.
  // Deliberately the same response as "no such user" too, so the form can't
  // be used to discover which e-mails are registered or how they sign in.
  const passwordOk =
    user?.password_hash != null && (await verifyPassword(password, user.password_hash));
  if (!user || !passwordOk) {
    await logLoginEvent({
      userId: user?.id ?? null,
      email,
      method: "password",
      action: "sign_in",
      success: false,
      reason: user && user.password_hash == null ? "google_only_account" : "bad_credentials",
      ...meta,
    });
    return { values, error: "auth.errors.badCredentials" };
  }

  await resetLoginAttempts(throttleKey);
  await recordLogin(user.id, language);
  await logLoginEvent({
    userId: user.id,
    email: user.email,
    method: "password",
    action: "sign_in",
    success: true,
    ...meta,
  });
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
  await logLoginEvent({
    userId: id,
    email: normalizeEmail(email),
    method: "password",
    action: "sign_up",
    success: true,
    ...(await requestMeta()),
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

// ------------------------------------------------------------- mobile OTP ---

export interface OtpState {
  /** Form-level error, as an i18n key. */
  error?: string;
  fieldErrors?: Partial<Record<"phone" | "code", string>>;
  /** Echoed back so a failed submit doesn't wipe the number. */
  values?: { phone?: string };
  /** Set once a code has gone out — the UI moves to the "enter code" step. */
  sent?: boolean;
  /** The number the code went to, in E.164; the verify step posts it back. */
  sentTo?: string;
  /** Same number, formatted for display. */
  sentToLabel?: string;
  /**
   * Development only: the code itself, when no SMS provider is configured.
   * Never set in production — see revealsOtp() in sms.ts.
   */
  devCode?: string;
  /** The number has no account: the UI offers the sign-up form, number pre-filled. */
  switchToSignUp?: boolean;
}

/**
 * Step 1: text a one-time code to a registered mobile number.
 *
 * Unlike the password-reset form this DOES say when a number is unknown.
 * Sending nothing and claiming success would strand a first-time visitor
 * waiting for a text that never comes; the sign-up form already reveals
 * whether a number is taken, so nothing new is leaked by saying so here.
 */
export async function requestOtp(
  _prev: OtpState | undefined,
  formData: FormData,
): Promise<OtpState> {
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const values = { phone: phoneRaw };

  if (!phoneRaw) return { values, fieldErrors: { phone: "auth.errors.phoneRequired" } };
  const phone = normalizePhone(phoneRaw);
  if (!phone) return { values, fieldErrors: { phone: "auth.errors.phoneInvalid" } };

  const meta = await requestMeta();
  if ((await bumpLoginAttempts(`otp-send:${phone}`, WINDOW_SECONDS)) > MAX_OTP_SENDS) {
    await logLoginEvent({
      userId: null,
      email: phone,
      method: "otp",
      action: "sign_in",
      success: false,
      reason: "too_many_sends",
      ...meta,
    });
    return { values, error: "auth.errors.tooMany" };
  }

  const user = await findUserByPhone(phone);
  if (!user) {
    await logLoginEvent({
      userId: null,
      email: phone,
      method: "otp",
      action: "sign_in",
      success: false,
      reason: "phone_unknown",
      ...meta,
    });
    return { values, switchToSignUp: true, error: "auth.errors.phoneUnknown" };
  }

  const issued = await issueOtp(user, phone);
  if (!issued.demo) {
    try {
      // The host goes in the text so the browser's SMS auto-fill recognises it.
      const host = new URL(await baseUrl()).host;
      await sendSms({ to: phone, body: otpSms(issued.code, OTP_TTL_MINUTES, host) });
    } catch (err) {
      console.error("OTP send failed", err);
      return { values, error: "auth.errors.smsFailed" };
    }
  }

  return {
    sent: true,
    sentTo: phone,
    sentToLabel: formatPhone(phone),
    values,
    devCode: !issued.demo && revealsOtp() ? issued.code : undefined,
  };
}

/** Step 2: check the code and sign in. */
export async function verifyOtp(
  _prev: OtpState | undefined,
  formData: FormData,
): Promise<OtpState> {
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const code = normalizeOtpInput(String(formData.get("code") ?? ""));
  const language = safeLanguage(formData.get("language"));

  const phone = normalizePhone(phoneRaw);
  if (!phone) return { values: { phone: phoneRaw }, fieldErrors: { phone: "auth.errors.phoneInvalid" } };

  // Everything below keeps the UI on the code step, with the number intact.
  const base: OtpState = {
    sent: true,
    sentTo: phone,
    sentToLabel: formatPhone(phone),
    values: { phone: phoneRaw },
  };

  if (code.length !== OTP_LENGTH) {
    return { ...base, fieldErrors: { code: "auth.errors.otpRequired" } };
  }

  const meta = await requestMeta();
  const throttleKey = `otp-verify:${phone}`;
  const user = await findUserByPhone(phone);

  if ((await bumpLoginAttempts(throttleKey, WINDOW_SECONDS)) > MAX_OTP_GUESSES) {
    // Out of guesses: the outstanding code is now worthless to everyone,
    // including its rightful owner, who simply asks for a new one.
    if (user) await burnOtp(user.id);
    await logLoginEvent({
      userId: user?.id ?? null,
      email: user?.email ?? phone,
      method: "otp",
      action: "sign_in",
      success: false,
      reason: "too_many_attempts",
      ...meta,
    });
    return { ...base, error: "auth.errors.tooMany" };
  }

  // Same response whether the number is unknown or the code is wrong.
  const ok = user ? await checkOtp(user.id, code) : false;
  if (!user || !ok) {
    await logLoginEvent({
      userId: user?.id ?? null,
      email: user?.email ?? phone,
      method: "otp",
      action: "sign_in",
      success: false,
      reason: user ? "bad_otp" : "phone_unknown",
      ...meta,
    });
    return { ...base, fieldErrors: { code: "auth.errors.otpInvalid" } };
  }

  await resetLoginAttempts(throttleKey);
  await resetLoginAttempts(`otp-send:${phone}`);
  await recordLogin(user.id, language);
  await logLoginEvent({
    userId: user.id,
    email: user.email,
    method: "otp",
    action: "sign_in",
    success: true,
    ...meta,
  });
  await createSession({
    userId: user.id,
    email: user.email,
    language,
    v: user.token_version,
  });

  redirect(safeNext(formData.get("next")));
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

/**
 * If the account signing out is the demo account, wipes its synced journey
 * so the next sign-in — by whoever, on whatever device — starts the
 * questionnaire from scratch. Scoped to that one email: nothing else about
 * sign-out changes for a real user, and this is a no-op unless
 * NEXT_PUBLIC_DEMO_EMAIL is set, so it is inert in a deployment with no demo
 * account configured at all.
 */
async function resetDemoAccountOnSignOut(): Promise<void> {
  const session = await readSession();
  if (session && isDemoEmail(session.email)) {
    await deleteUserState(session.userId).catch(() => {
      // Best-effort: a failed reset should never block signing out.
    });
  }
}

export async function signOut(): Promise<void> {
  await resetDemoAccountOnSignOut();
  await deleteSession();
  redirect("/login");
}

/**
 * Sign out and land straight on the "create account" form.
 *
 * Without this, a signed-in visitor to /login sees only the account card, so
 * there is no route to a second account short of finding Sign out first — a
 * real problem on a phone shared by a family.
 */
export async function signOutAndSignUp(): Promise<void> {
  await resetDemoAccountOnSignOut();
  await deleteSession();
  redirect("/login?mode=signup");
}
