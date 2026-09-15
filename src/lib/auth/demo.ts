import "server-only";

/**
 * Identifies the demo account, and only the demo account.
 *
 * `NEXT_PUBLIC_DEMO_EMAIL` is already inlined into the client bundle to show
 * the credential card on the sign-in form; reusing it here — rather than a
 * second variable — keeps "which account is the demo" defined in one place.
 * Safe to read from a server module: Next.js also populates NEXT_PUBLIC_*
 * vars into `process.env` on the server, it just additionally inlines them
 * into client code.
 */
export function isDemoEmail(email: string): boolean {
  const demo = process.env.NEXT_PUBLIC_DEMO_EMAIL;
  if (!demo) return false;
  return email.trim().toLowerCase() === demo.trim().toLowerCase();
}

/**
 * The fixed OTP for the demo phone number, or null for any other number.
 *
 * Exists so a client can be shown mobile sign-in on a deployed site without
 * an SMS provider, or without owning the phone — the same reason app-store
 * reviewers are given a test account with a fixed code. Both variables are
 * NEXT_PUBLIC_ on purpose, mirroring the demo e-mail/password: the login page
 * prints them, so they are public by design and must never belong to a real
 * person. Absent either one, this is inert.
 */
export function demoOtpFor(phone: string): string | null {
  const demoPhone = process.env.NEXT_PUBLIC_DEMO_PHONE;
  const demoCode = process.env.NEXT_PUBLIC_DEMO_OTP;
  if (!demoPhone || !demoCode) return null;
  // Compared on digits only, so "+91 98765 43210" and "9876543210" both match.
  const digits = (v: string) => v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return digits(phone) === digits(demoPhone) ? demoCode : null;
}
