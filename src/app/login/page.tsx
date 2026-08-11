import { Suspense } from "react";
import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import { LoginScreen } from "@/components/feature/LoginScreen";
import { getOptionalUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your QuitTobacco account to continue your quit journey.",
};

export default async function LoginPage() {
  // Reachable while signed in, so the language picker is always available.
  const user = await getOptionalUser();

  return (
    // LoginScreen reads the ?next= search param, which needs a Suspense boundary.
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center px-6">
          <Brand />
        </main>
      }
    >
      <LoginScreen
        account={
          user ? { email: user.email, name: user.display_name ?? undefined } : null
        }
      />
    </Suspense>
  );
}
