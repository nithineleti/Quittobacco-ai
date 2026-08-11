import "server-only";

/**
 * Outbound e-mail. Deliberately provider-agnostic and tiny.
 *
 * Resend is the default because it is an HTTPS API: serverless platforms
 * (Netlify, Vercel) block outbound SMTP ports, so a classic SMTP client would
 * silently fail there. Any other HTTPS mail API can be dropped in below.
 *
 * With no API key configured the message is written to the server log instead
 * of being sent. That keeps local development working with zero setup — but it
 * means a misconfigured production deploy would quietly stop e-mailing people,
 * so `assertMailerConfigured()` is called at sign-up/reset time in production.
 */

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const FROM = process.env.MAIL_FROM ?? "QuitTobacco <onboarding@resend.dev>";

export function isMailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * In production, silently logging a password-reset link to a server log is
 * worse than failing: the user waits for an e-mail that will never arrive.
 */
export function assertMailerConfigured(): void {
  if (process.env.NODE_ENV === "production" && !isMailerConfigured()) {
    throw new Error(
      "RESEND_API_KEY is not set. Password reset cannot deliver e-mail in production.",
    );
  }
}

export async function sendMail(mail: Mail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Development fallback. Never reached in production — see the assert above.
    console.info(
      `\n──────── e-mail (not sent: no RESEND_API_KEY) ────────\n` +
        `To:      ${mail.to}\n` +
        `Subject: ${mail.subject}\n\n${mail.text}\n` +
        `──────────────────────────────────────────────────────\n`,
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });

  if (!res.ok) {
    // Surface the provider's reason in the server log, never to the user —
    // the response body can echo the address back.
    const detail = await res.text().catch(() => "");
    console.error(`Mail send failed (${res.status}): ${detail.slice(0, 300)}`);
    throw new Error("Could not send e-mail");
  }
}

/** Plain, high-contrast, and readable on a cheap phone — no images, no tracking. */
export function passwordResetMail(link: string, expiresMinutes: number): Omit<Mail, "to"> {
  const text = [
    "Reset your QuitTobacco password",
    "",
    "Tap the link below to choose a new password:",
    link,
    "",
    `This link works once and expires in ${expiresMinutes} minutes.`,
    "If you didn't ask for this, you can ignore this e-mail — your password stays the same.",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fbfaf7;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#131611">
  <div style="max-width:480px;margin:0 auto">
    <h1 style="font-size:20px;margin:0 0 16px">Reset your QuitTobacco password</h1>
    <p style="margin:0 0 20px;line-height:1.5">Tap the button below to choose a new password.</p>
    <p style="margin:0 0 24px">
      <a href="${link}" style="display:inline-block;min-height:48px;line-height:48px;padding:0 24px;border-radius:999px;background:#0f7060;color:#fff;text-decoration:none;font-weight:600">Choose a new password</a>
    </p>
    <p style="margin:0 0 8px;font-size:14px;color:#5b6157;line-height:1.5">
      This link works once and expires in ${expiresMinutes} minutes.
    </p>
    <p style="margin:0;font-size:14px;color:#5b6157;line-height:1.5">
      If you didn't ask for this, ignore this e-mail — your password stays the same.
    </p>
  </div>
</body></html>`;

  return { subject: "Reset your QuitTobacco password", text, html };
}
