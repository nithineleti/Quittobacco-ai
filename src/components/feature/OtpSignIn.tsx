"use client";

import { useActionState, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { requestOtp, verifyOtp, type OtpState } from "@/lib/auth/actions";

const EMPTY: OtpState = {};

const linkClasses =
  "min-h-11 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

/**
 * Sign in with a mobile number and a texted one-time code, in two steps:
 * number -> code. Lives beside the password form on the login page and
 * shares its language / ?next= plumbing.
 */
export function OtpSignIn({
  language,
  next,
  defaultPhone,
  onUnknownPhone,
}: {
  language: string;
  next: string;
  /** Pre-filled number, e.g. from the demo card. */
  defaultPhone?: string;
  /** The number has no account — the parent switches to sign-up with it filled in. */
  onUnknownPhone: (phone: string) => void;
}) {
  const { t } = useTranslation();
  const [reqState, reqAction, reqPending] = useActionState(requestOtp, EMPTY);

  // Which step is showing. Follows the latest request result — a successful
  // send moves to the code step — and "Change number" moves back. Adjusted
  // during render (React's pattern for reacting to a changed prop/state)
  // rather than in an effect, which would paint the wrong step for a frame.
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [lastReq, setLastReq] = useState<OtpState>(reqState);
  // Every successful send remounts the code step, so a stale "wrong code"
  // error and half-typed digits never carry over to a freshly sent code.
  const [sendCount, setSendCount] = useState(0);
  if (reqState !== lastReq) {
    setLastReq(reqState);
    if (reqState.sent) {
      setStep("code");
      setSendCount((n) => n + 1);
    }
  }

  const phoneId = useId();

  if (step === "code" && reqState.sentTo) {
    return (
      <CodeStep
        key={sendCount}
        phone={reqState.sentTo}
        phoneLabel={reqState.sentToLabel ?? reqState.sentTo}
        devCode={reqState.devCode}
        language={language}
        next={next}
        resendAction={reqAction}
        resendPending={reqPending}
        resendError={reqState.sent ? undefined : reqState.error}
        onChangeNumber={() => setStep("phone")}
      />
    );
  }

  const phoneValue = reqState.values?.phone ?? defaultPhone;

  return (
    <div className="flex flex-col gap-4">
      {reqState.error && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {t(reqState.error)}
          {reqState.switchToSignUp && (
            <button
              type="button"
              onClick={() => onUnknownPhone(phoneValue ?? "")}
              className="self-start text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("auth.otpCreateAccount")}
            </button>
          )}
        </div>
      )}

      <form action={reqAction} className="flex flex-col gap-4">
        <Field
          label={t("auth.phone")}
          htmlFor={phoneId}
          description={t("auth.otpHelp")}
          error={reqState.fieldErrors?.phone ? t(reqState.fieldErrors.phone) : undefined}
        >
          <Input
            id={phoneId}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            defaultValue={phoneValue}
            placeholder="98765 43210"
          />
        </Field>

        <Button type="submit" size="lg" full disabled={reqPending}>
          {reqPending ? t("common.loading") : t("auth.sendOtp")}
        </Button>
      </form>
    </div>
  );
}

function CodeStep({
  phone,
  phoneLabel,
  devCode,
  language,
  next,
  resendAction,
  resendPending,
  resendError,
  onChangeNumber,
}: {
  phone: string;
  phoneLabel: string;
  devCode?: string;
  language: string;
  next: string;
  resendAction: (formData: FormData) => void;
  resendPending: boolean;
  resendError?: string;
  onChangeNumber: () => void;
}) {
  const { t } = useTranslation();
  const [state, action, pending] = useActionState(verifyOtp, EMPTY);
  const codeId = useId();

  const error = state.error ?? resendError;

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="text-sm text-muted">
        {t("auth.otpSentTo", { phone: phoneLabel })}
      </p>

      {/* Development only: the server sets this only when no SMS provider is
          configured and NODE_ENV is not production — see sms.ts. */}
      {devCode && (
        <div className="flex flex-col gap-1 rounded-card border border-dashed border-border bg-surface-2 p-4">
          <p className="text-sm font-semibold text-fg">{t("auth.otpDevTitle")}</p>
          <p className="font-mono text-2xl font-bold tracking-[0.3em] text-fg" data-testid="dev-otp">
            {devCode}
          </p>
          <p className="text-xs text-muted">{t("auth.otpDevHint")}</p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {t(error)}
        </p>
      )}

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="language" value={language} />
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="phone" value={phone} />

        <Field
          label={t("auth.otpCode")}
          htmlFor={codeId}
          description={t("auth.otpExpiry")}
          error={state.fieldErrors?.code ? t(state.fieldErrors.code) : undefined}
        >
          <Input
            id={codeId}
            name="code"
            type="text"
            inputMode="numeric"
            // Lets iOS/Android offer the code straight from the incoming SMS.
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            required
            autoFocus
            className={cn("text-center font-mono text-2xl tracking-[0.4em]")}
            placeholder="······"
          />
        </Field>

        <Button type="submit" size="lg" full disabled={pending}>
          {pending ? t("common.loading") : t("auth.verifyOtp")}
        </Button>
      </form>

      <div className="flex items-center justify-between gap-4">
        <form action={resendAction}>
          <input type="hidden" name="phone" value={phone} />
          <button type="submit" disabled={resendPending} className={linkClasses}>
            {resendPending ? t("common.loading") : t("auth.resendOtp")}
          </button>
        </form>
        <button type="button" onClick={onChangeNumber} className={linkClasses}>
          {t("auth.changeNumber")}
        </button>
      </div>
    </div>
  );
}
