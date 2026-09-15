import "server-only";

/**
 * Outbound SMS for one-time sign-in codes. Same shape as mailer.ts, and for
 * the same reasons: an HTTPS API rather than a carrier SDK, so it works from
 * a serverless function and adds no dependency.
 *
 * Twilio is the default because it is the one provider that reliably delivers
 * to Indian mobiles from a free trial account (a verified caller ID is enough
 * to test). Any HTTPS SMS API — MSG91, Fast2SMS, Exotel — can be dropped into
 * `sendSms` below; nothing else in the app knows which provider is in use.
 *
 * With no credentials configured the message is written to the server log
 * instead of being sent, so local development needs zero setup — and, since a
 * developer shouldn't have to tail a terminal to test a login form, the
 * request action ALSO returns the code to the page in that case. Both are
 * disabled in production: see `revealsOtp()`.
 */

export interface Sms {
  /** E.164, e.g. +919876543210. */
  to: string;
  body: string;
}

const TWILIO_API = "https://api.twilio.com/2010-04-01/Accounts";

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID),
  );
}

/**
 * Whether the mobile-OTP option should appear on the login page at all.
 * Showing a "Send OTP" button that can never deliver is worse than showing
 * nothing — the visitor waits for a text that isn't coming.
 */
export function isOtpSignInAvailable(): boolean {
  if (isSmsConfigured()) return true;
  // No provider, but a fixed demo code is configured — see demo.ts.
  if (process.env.NEXT_PUBLIC_DEMO_PHONE && process.env.NEXT_PUBLIC_DEMO_OTP) {
    return true;
  }
  // Development: the code is shown on screen instead of being sent.
  return process.env.NODE_ENV !== "production";
}

/**
 * True when the freshly issued code may be echoed back to the browser. Only
 * ever in development with no provider — a production deploy that reveals
 * the OTP on the page would make the second factor worthless.
 */
export function revealsOtp(): boolean {
  return process.env.NODE_ENV !== "production" && !isSmsConfigured();
}

export async function sendSms(sms: Sms): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token || !isSmsConfigured()) {
    if (process.env.NODE_ENV === "production") {
      // Never reached when the login page is gated on isOtpSignInAvailable(),
      // but a direct action call must still fail loudly rather than pretend.
      throw new Error(
        "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM are not set. Mobile OTP cannot deliver SMS in production.",
      );
    }
    console.info(
      `\n──────── SMS (not sent: no Twilio credentials) ────────\n` +
        `To: ${sms.to}\n\n${sms.body}\n` +
        `────────────────────────────────────────────────────────\n`,
    );
    return;
  }

  const form = new URLSearchParams({ To: sms.to, Body: sms.body });
  // A Messaging Service picks the sender per destination country, which is
  // what you want once you have more than one number. A single From works for
  // a trial account.
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    form.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  } else {
    form.set("From", process.env.TWILIO_FROM ?? "");
  }

  const res = await fetch(`${TWILIO_API}/${encodeURIComponent(sid)}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  if (!res.ok) {
    // Provider's reason goes to the server log only — it echoes the number.
    const detail = await res.text().catch(() => "");
    console.error(`SMS send failed (${res.status}): ${detail.slice(0, 300)}`);
    throw new Error("Could not send SMS");
  }
}

/**
 * Short and plain: a cheap phone shows ~160 characters per segment, and the
 * code is the first thing on the line so it shows in the notification preview.
 * The "@domain #code" suffix is the WebOTP / Android SMS Retriever format —
 * with it, the browser can offer to auto-fill the code on the login page.
 */
export function otpSms(code: string, expiresMinutes: number, host?: string): string {
  const lines = [
    `${code} is your QuitTobacco sign-in code. It expires in ${expiresMinutes} minutes. Never share it with anyone.`,
  ];
  if (host) lines.push("", `@${host} #${code}`);
  return lines.join("\n");
}
