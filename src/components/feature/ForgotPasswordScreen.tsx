"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useHydrated } from "@/lib/store";
import { requestPasswordReset, type ResetState } from "@/lib/auth/actions";

const EMPTY: ResetState = {};

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState(requestPasswordReset, EMPTY);
  const emailId = useId();

  // Same guard as the login screen: language lives in localStorage, so painting
  // before rehydration would flash English at a Hindi user.
  if (!hydrated) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <Brand />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <Brand />
        <h1 className="text-2xl font-bold text-fg">{t("auth.forgotTitle")}</h1>
        <p className="text-sm text-muted">{t("auth.forgotBody")}</p>
      </header>

      {state.sent ? (
        // Deliberately identical whether or not the address is registered.
        <Card className="flex flex-col items-center gap-4 text-center">
          <span className="grid size-14 place-items-center rounded-pill bg-success-soft">
            <Icon name="Mail" className="size-7 text-success" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-fg">{t("auth.resetSentTitle")}</p>
            <p className="text-sm text-muted">
              {t("auth.resetSentBody", { email: state.values?.email ?? "" })}
            </p>
          </div>
          <p className="text-sm text-muted">{t("auth.resetSentHint")}</p>
        </Card>
      ) : (
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
            <Field
              label={t("auth.email")}
              htmlFor={emailId}
              error={state.fieldErrors?.email ? t(state.fieldErrors.email) : undefined}
            >
              <Input
                id={emailId}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                defaultValue={state.values?.email}
                placeholder={t("auth.emailPlaceholder")}
              />
            </Field>

            <Button type="submit" size="lg" full disabled={pending}>
              {pending ? t("common.loading") : t("auth.sendResetLink")}
            </Button>
          </form>
        </Card>
      )}

      <Link
        href="/login"
        className="text-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        {t("auth.backToSignIn")}
      </Link>
    </main>
  );
}
