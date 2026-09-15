/**
 * Hand-rolled validation rather than Zod — the rules are few, and the app has
 * kept its dependency list deliberately short. Returns i18n KEYS, never English
 * strings, so errors render in the language the user picked on the login page.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Indian mobile numbers, with or without +91 / leading 0. */
const PHONE_RE = /^(?:\+?91)?[6-9]\d{9}$/;

export const MIN_PASSWORD = 10;

/**
 * A short, curated set of the passwords real breach corpora show people reach
 * for first — not a full breach-list (checking against one, e.g. via
 * Have I Been Pwned's API, would mean sending part of every signup password
 * to a third party; a reasonable future addition, but not something to wire
 * up silently in a government-context app). This blocks the handful of
 * guesses a credential-stuffing attempt tries before anything else.
 *
 * Deliberately NOT a forced-complexity rule (no "must contain a symbol").
 * NIST 800-63B — the standard a government context would actually be
 * measured against — recommends length and a blocklist over composition
 * rules, precisely because forced complexity measurably pushes real users
 * toward "Passw0rd!" and reused patterns rather than stronger passwords.
 */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "passw0rd", "letmein123",
  "welcome123", "iloveyou123", "admin1234", "changeme123", "trustno1",
  "12345678", "123456789", "1234567890", "0123456789", "9876543210",
  "qwertyuiop", "abcdefghij", "quittobacco", "quittobacco1",
]);

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "auth.errors.emailRequired";
  if (!EMAIL_RE.test(email)) return "auth.errors.emailInvalid";
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "auth.errors.passwordRequired";
  if (value.length < MIN_PASSWORD) return "auth.errors.passwordShort";
  if (COMMON_PASSWORDS.has(value.toLowerCase())) return "auth.errors.passwordCommon";
  // A single character repeated for the whole length ("aaaaaaaaaa") passes
  // the length check but carries almost none of the entropy that implies.
  if (/^(.)\1+$/.test(value)) return "auth.errors.passwordCommon";
  return null;
}

/** Normalises to E.164 (+91XXXXXXXXXX). Returns null if not a valid mobile. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/[\s()-]/g, "").replace(/^0+/, "");
  if (!PHONE_RE.test(digits)) return null;
  const bare = digits.replace(/^\+?91/, "");
  return `+91${bare}`;
}

/** "+919876543210" -> "+91 98765 43210", the grouping printed on Indian SIM packs. */
export function formatPhone(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}
