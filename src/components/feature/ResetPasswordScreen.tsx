"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, inputClasses } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/store";
import { performPasswordReset, type ResetState } from "@/lib/auth/actions";

const EMPTY: ResetState = {};

export function ResetPasswordScreen({
  token,
  valid,
}: {
  token: string;
  valid: boolean;
}) {
  const { t } = useTranslation();
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState(performPasswordReset, EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  // Controlled, for the same reason as the login form: React clears these on
  // action completion, which would silently empty them after a failed attempt.
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const passwordId = useId();
  const confirmId = useId();

  if (!hydrated) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <Brand />
      </main>
    );
  }

  const shell = (children: React.ReactNode) => (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <Brand />
      </header>
      {children}
    </main>
  );

  // Link expired, already used, or tampered with.
  if (!valid && !state.done) {
    return shell(
      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-pill bg-danger-soft">
          <Icon name="AlertTriangle" className="size-7 text-danger" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-fg">{t("auth.resetExpiredTitle")}</p>
          <p className="text-sm text-muted">{t("auth.resetExpiredBody")}</p>
        </div>
        <Link href="/forgot" className={buttonClasses({ size: "lg", full: true })}>
          {t("auth.sendResetLink")}
        </Link>
      </Card>,
    );
  }

  if (state.done) {
    return shell(
      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-pill bg-success-soft">
          <Icon name="CheckCircle2" className="size-7 text-success" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-fg">{t("auth.resetDoneTitle")}</p>
          <p className="text-sm text-muted">{t("auth.resetDoneBody")}</p>
        </div>
        <Link href="/login" className={buttonClasses({ size: "lg", full: true })}>
          {t("auth.submitSignIn")}
        </Link>
      </Card>,
    );
  }

  return shell(
    <>
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold text-fg">{t("auth.resetTitle")}</h1>
        <p className="text-sm text-muted">{t("auth.resetBody")}</p>
      </div>

      <Card className="flex flex-col gap-5">
        {state.error && (
          <p
            role="alert"
            className="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            {t(state.error)}
          </p>
        )}

        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />

          <Field
            label={t("auth.newPassword")}
            htmlFor={passwordId}
            description={t("auth.passwordHint")}
            error={state.fieldErrors?.password ? t(state.fieldErrors.password) : undefined}
          >
            <div className="relative">
              <input
                id={passwordId}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(inputClasses, "pr-12")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={t(showPassword ? "auth.hidePassword" : "auth.showPassword")}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-card text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? (
                  <EyeOff className="size-5" aria-hidden />
                ) : (
                  <Eye className="size-5" aria-hidden />
                )}
              </button>
            </div>
          </Field>

          <Field
            label={t("auth.confirm")}
            htmlFor={confirmId}
            error={state.fieldErrors?.confirm ? t(state.fieldErrors.confirm) : undefined}
          >
            <Input
              id={confirmId}
              name="confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>

          <Button type="submit" size="lg" full disabled={pending}>
            {pending ? t("common.loading") : t("auth.saveNewPassword")}
          </Button>
        </form>
      </Card>
    </>,
  );
}
