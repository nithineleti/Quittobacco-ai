/**
 * Hand-rolled validation rather than Zod — the rules are few, and the app has
 * kept its dependency list deliberately short. Returns i18n KEYS, never English
 * strings, so errors render in the language the user picked on the login page.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Indian mobile numbers, with or without +91 / leading 0. */
const PHONE_RE = /^(?:\+?91)?[6-9]\d{9}$/;

export const MIN_PASSWORD = 8;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "auth.errors.emailRequired";
  if (!EMAIL_RE.test(email)) return "auth.errors.emailInvalid";
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "auth.errors.passwordRequired";
  if (value.length < MIN_PASSWORD) return "auth.errors.passwordShort";
  return null;
}

/** Normalises to E.164 (+91XXXXXXXXXX). Returns null if not a valid mobile. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/[\s()-]/g, "").replace(/^0+/, "");
  if (!PHONE_RE.test(digits)) return null;
  const bare = digits.replace(/^\+?91/, "");
  return `+91${bare}`;
}
