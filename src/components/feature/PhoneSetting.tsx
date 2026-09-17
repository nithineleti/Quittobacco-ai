"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { IconTile } from "@/components/ui/IconTile";
import { Pill } from "@/components/ui/Pill";
import { Sheet } from "@/components/ui/Sheet";
import {
  confirmPhoneVerification,
  removePhone,
  requestPhoneVerification,
  type PhoneState,
} from "@/lib/auth/actions";
import { formatPhone } from "@/lib/auth/validate";

const EMPTY: PhoneState = {};

/**
 * The mobile number on the account, on the Profile screen: add one, change
 * it, verify the one typed at sign-up, or remove it. Every change is
 * confirmed by a code texted to the number, so a number on an account is
 * one its owner actually holds.
 */
export function PhoneSetting({
  phone,
  verified,
}: {
  /** E.164, or null when none is on the account. */
  phone: string | null;
  verified: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  // Which number the sheet opens with: the current one for "Verify", empty
  // for "Change". Also keys the sheet so its form state resets each time.
  const [initial, setInitial] = useState<{ phone: string; n: number }>({ phone: "", n: 0 });

  const openWith = (value: string) => {
    setInitial((s) => ({ phone: value, n: s.n + 1 }));
    setOpen(true);
  };

  return (
    <>
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <IconTile icon="Smartphone" hue="sky" size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-fg">{t("profile.mobile")}</p>
            <p className="text-sm text-muted">
              {phone ? formatPhone(phone) : t("profile.mobileNone")}
            </p>
          </div>
          {phone && (
            <Pill tone={verified ? "success" : "warning"}>
              {verified ? t("profile.mobileVerified") : t("profile.mobileUnverified")}
            </Pill>
          )}
        </div>
        <p className="text-sm text-muted">{t("profile.mobileHelp")}</p>
        <div className="flex flex-wrap gap-2">
          {phone && !verified && (
            <Button size="sm" onClick={() => openWith(phone)}>
              {t("profile.mobileVerify")}
            </Button>
          )}
          <Button
            size="sm"
            variant={phone && !verified ? "secondary" : "primary"}
            onClick={() => openWith("")}
          >
            {t(phone ? "profile.mobileChange" : "profile.mobileAdd")}
          </Button>
          {phone && (
            <Button size="sm" variant="ghost" onClick={() => setRemoveOpen(true)}>
              {t("profile.mobileRemove")}
            </Button>
          )}
        </div>
      </Card>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("profile.mobileSheetTitle")}>
        <VerifyFlow
          key={initial.n}
          initialPhone={initial.phone}
          onDone={() => {
            // Server props (phone, verified) changed — re-render the page.
            router.refresh();
            setOpen(false);
          }}
        />
      </Sheet>

      <Sheet
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title={t("profile.mobileRemove")}
      >
        <div className="flex flex-col gap-4">
          <p className="text-base text-fg">{t("profile.mobileRemoveConfirm")}</p>
          <form
            action={async () => {
              await removePhone();
              router.refresh();
              setRemoveOpen(false);
            }}
          >
            <Button type="submit" variant="danger" size="lg" full>
              {t("profile.mobileRemove")}
            </Button>
          </form>
          <Button variant="ghost" onClick={() => setRemoveOpen(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function VerifyFlow({
  initialPhone,
  onDone,
}: {
  initialPhone: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [reqState, reqAction, reqPending] = useActionState(requestPhoneVerification, EMPTY);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [lastReq, setLastReq] = useState(reqState);
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
        resendAction={reqAction}
        resendPending={reqPending}
        resendError={reqState.sent ? undefined : reqState.error}
        onChangeNumber={() => setStep("phone")}
        onDone={onDone}
      />
    );
  }

  return (
    <form action={reqAction} className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("profile.mobileSheetBody")}</p>
      {reqState.error && (
        <p role="alert" className="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {t(reqState.error)}
        </p>
      )}
      <Field
        label={t("auth.phone")}
        htmlFor={phoneId}
        error={reqState.fieldErrors?.phone ? t(reqState.fieldErrors.phone) : undefined}
      >
        <Input
          id={phoneId}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          autoFocus
          defaultValue={reqState.values?.phone ?? initialPhone}
          placeholder="98765 43210"
        />
      </Field>
      <Button type="submit" size="lg" full disabled={reqPending}>
        {reqPending ? t("common.loading") : t("auth.sendOtp")}
      </Button>
    </form>
  );
}

function CodeStep({
  phone,
  phoneLabel,
  devCode,
  resendAction,
  resendPending,
  resendError,
  onChangeNumber,
  onDone,
}: {
  phone: string;
  phoneLabel: string;
  devCode?: string;
  resendAction: (formData: FormData) => void;
  resendPending: boolean;
  resendError?: string;
  onChangeNumber: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [state, action, pending] = useActionState(confirmPhoneVerification, EMPTY);
  const codeId = useId();

  // Success is a side effect on the parent (refresh + close), so it lives in
  // an effect rather than the render-time adjustment used for step changes.
  useEffect(() => {
    if (state.done) onDone();
  }, [state.done, onDone]);

  const error = state.error ?? resendError;
  const linkClasses =
    "min-h-11 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  if (state.done) {
    return (
      <p role="status" className="flex items-start gap-2 text-base text-fg">
        <Icon name="CheckCircle2" className="mt-0.5 size-5 shrink-0 text-success" />
        {t("profile.mobileDone")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="text-sm text-muted">
        {t("auth.otpSentTo", { phone: phoneLabel })}
      </p>
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
        <p role="alert" className="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {t(error)}
        </p>
      )}
      <form action={action} className="flex flex-col gap-4">
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
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            required
            autoFocus
            className="text-center font-mono text-2xl tracking-[0.4em]"
            placeholder="······"
          />
        </Field>
        <Button type="submit" size="lg" full disabled={pending}>
          {pending ? t("common.loading") : t("profile.mobileConfirm")}
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
