"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, inputClasses } from "@/components/ui/Field";
import { LANGUAGES } from "@/i18n/languages";
import { cn } from "@/lib/cn";
import { useHydrated, useStore } from "@/lib/store";
import { signOutCleanup } from "@/lib/sync";
import type { Language } from "@/data/types";
import {
  signIn,
  signOut,
  signOutAndSignUp,
  signUp,
  updateLanguage,
  type AuthState,
} from "@/lib/auth/actions";

type Mode = "signin" | "signup";

const EMPTY: AuthState = {};

export interface LoginAccount {
  email: string;
  name?: string;
}

export function LoginScreen({ account }: { account?: LoginAccount | null }) {
  const { t } = useTranslation();
  const params = useSearchParams();
  const next = params.get("next") ?? "";

  const hydrated = useHydrated();
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);

  /**
   * Picking a language here must stick for a signed-in user too, so it is
   * written to the account as well as the device. Signed out there is no
   * account yet — the choice rides along on the form's hidden field instead.
   */
  const chooseLanguage = (code: string) => {
    setLanguage(code as Language);
    if (account) void updateLanguage(code);
  };

  // ?mode=signup is set by "create a different account" on the signed-in card.
  const wantsSignUp = params.get("mode") === "signup";
  const [mode, setMode] = useState<Mode>(wantsSignUp ? "signup" : "signin");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * Controlled, unlike the other fields. React resets a form once its action
   * resolves, and the password boxes have no defaultValue to be restored from
   * (we never echo a password back through the server). So on a failed submit
   * they were silently emptied while name/email/phone survived: the user saw
   * only "passwords don't match", retyped that one box, and failed again.
   */
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [inState, inAction, inPending] = useActionState(signIn, EMPTY);
  const [upState, upAction, upPending] = useActionState(signUp, EMPTY);

  const state = mode === "signin" ? inState : upState;
  const pending = mode === "signin" ? inPending : upPending;

  // The e-mail is already registered — drop the user into sign-in with the
  // address they typed still in the box, rather than making them start over.
  // Adjusted during render (React's documented pattern for reacting to changed
  // input) rather than in an effect, which would cause a cascading re-render.
  // Same-route navigation (signed-in card -> ?mode=signup) does not remount
  // this component, so the initialiser above never re-runs. Adjust on change.
  const [lastWantsSignUp, setLastWantsSignUp] = useState(wantsSignUp);
  if (wantsSignUp !== lastWantsSignUp) {
    setLastWantsSignUp(wantsSignUp);
    if (wantsSignUp) setMode("signup");
  }

  const switched = upState.switchToSignIn ?? false;
  const [lastSwitched, setLastSwitched] = useState(false);
  const [switchNotice, setSwitchNotice] = useState<string | null>(null);
  if (switched !== lastSwitched) {
    setLastSwitched(switched);
    if (switched) {
      setMode("signin");
      // Carry the reason across with them — the sign-in action has its own
      // (empty) state, so without this the user is bounced with no explanation.
      setSwitchNotice(upState.error ?? "auth.errors.emailTaken");
    }
  }

  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();
  const nameId = useId();
  const phoneId = useId();

  const err = (key?: string) => (key ? t(key) : undefined);
  const prefill = upState.switchToSignIn ? upState.values : state.values;

  // The chosen language lives in localStorage, so the server always renders
  // English. Painting before the store rehydrates causes a hydration mismatch
  // and a visible flash of English for a Hindi user — same guard the other
  // screens use.
  if (!hydrated) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <Brand />
      </main>
    );
  }

  // A fresh error from the submitted form always wins over the carried-over
  // "that email is taken" explanation.
  const shownError =
    mode === "signin" ? (inState.error ?? switchNotice ?? undefined) : upState.error;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <Brand />
        <h1 className="text-2xl font-bold text-fg">{t("auth.title")}</h1>
        <p className="text-sm text-muted">
          {account ? t("auth.languageHere") : t("auth.subtitle")}
        </p>
      </header>

      {/* Language first: the user picks how to read the rest of the page. */}
      <section aria-labelledby="lang-label" className="flex flex-col gap-2">
        <span id="lang-label" className="text-sm font-semibold text-fg">
          {t("auth.language")}
        </span>
        <div role="group" aria-labelledby="lang-label" className="flex gap-2">
          {LANGUAGES.map((l) => {
            const active = l.code === language;
            return (
              <button
                key={l.code}
                type="button"
                aria-pressed={active}
                onClick={() => chooseLanguage(l.code)}
                className={cn(
                  "min-h-12 flex-1 rounded-card border px-4 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary bg-primary-soft text-fg"
                    : "border-border bg-card text-fg hover:bg-surface-2",
                )}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Already signed in: no form to show, just the way onward or out. The
          language picker above stays fully usable — that is why this page no
          longer redirects. */}
      {account ? (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-fg">
              {account.name || t("auth.signedIn")}
            </p>
            <p className="text-sm text-muted">
              {t("auth.signedInAs", { email: account.email })}
            </p>
          </div>

          <Link href="/" className={buttonClasses({ size: "lg", full: true })}>
            {t("auth.continueToApp")}
          </Link>

          <form action={async () => { await signOutCleanup(); await signOut(); }}>
            <Button type="submit" variant="secondary" full>
              {t("auth.signOut")}
            </Button>
          </form>

          {/* Without this there is no way to reach the sign-up form while
              signed in — which matters on a phone shared by a family. */}
          <form action={async () => { await signOutCleanup(); await signOutAndSignUp(); }}>
            <button
              type="submit"
              className="min-h-11 w-full text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("auth.createDifferentAccount")}
            </button>
          </form>
        </Card>
      ) : (
      <Card className="flex flex-col gap-5">
        {/* Sign in / Create account */}
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-pill bg-surface-2 p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setNotice(null);
                setSwitchNotice(null);
                // Don't carry a half-typed password between sign-in and sign-up.
                setPassword("");
                setConfirm("");
              }}
              className={cn(
                // px-2, not px-4: "Create account" wraps to two lines at 360px otherwise.
                "min-h-11 whitespace-nowrap rounded-pill px-2 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                mode === m ? "bg-card text-fg" : "text-muted hover:text-fg",
              )}
            >
              {t(m === "signin" ? "auth.tabSignIn" : "auth.tabSignUp")}
            </button>
          ))}
        </div>

        {shownError && (
          <p
            role="alert"
            className="rounded-card bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            {t(shownError)}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-card bg-primary-soft px-4 py-3 text-sm font-medium text-fg"
          >
            {notice}
          </p>
        )}

        <form
          action={mode === "signin" ? inAction : upAction}
          onSubmit={() => setSwitchNotice(null)}
          className="flex flex-col gap-4"
          // Remount on mode switch so stale values never bleed across forms.
          key={mode}
        >
          <input type="hidden" name="language" value={language} />
          <input type="hidden" name="next" value={next} />

          {mode === "signup" && (
            <Field label={t("auth.name")} htmlFor={nameId}>
              <Input
                id={nameId}
                name="name"
                autoComplete="name"
                defaultValue={prefill?.name}
                placeholder={t("auth.namePlaceholder")}
              />
            </Field>
          )}

          <Field
            label={t("auth.email")}
            htmlFor={emailId}
            error={err(state.fieldErrors?.email)}
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
              defaultValue={prefill?.email}
              placeholder={t("auth.emailPlaceholder")}
            />
          </Field>

          {mode === "signup" && (
            <Field
              label={t("auth.phone")}
              htmlFor={phoneId}
              description={t("auth.phoneHelp")}
              error={err(state.fieldErrors?.phone)}
            >
              <Input
                id={phoneId}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                defaultValue={prefill?.phone}
                placeholder="98765 43210"
              />
            </Field>
          )}

          <Field
            label={t("auth.password")}
            htmlFor={passwordId}
            description={mode === "signup" ? t("auth.passwordHint") : undefined}
            error={err(state.fieldErrors?.password)}
          >
            <div className="relative">
              <input
                id={passwordId}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
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

          {mode === "signup" && (
            <Field
              label={t("auth.confirm")}
              htmlFor={confirmId}
              error={err(state.fieldErrors?.confirm)}
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
          )}

          <Button type="submit" size="lg" full disabled={pending}>
            {pending
              ? t("common.loading")
              : t(mode === "signin" ? "auth.submitSignIn" : "auth.submitSignUp")}
          </Button>
        </form>

        {mode === "signin" && (
          <Link
            href="/forgot"
            className="text-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("auth.forgot")}
          </Link>
        )}
      </Card>
      )}

      {/* Phone + OTP sign-in is scheduled, not built. Saying so is better than
          showing a button that does nothing. */}
      {!account && (
        <p className="text-center text-xs text-muted">{t("auth.otpSoon")}</p>
      )}
    </main>
  );
}
