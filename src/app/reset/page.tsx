import type { Metadata } from "next";
import { ResetPasswordScreen } from "@/components/feature/ResetPasswordScreen";
import { checkResetToken } from "@/lib/auth/reset";

export const metadata: Metadata = {
  title: "Choose a new password",
  // A reset link must never be indexed or previewed by a crawler.
  robots: { index: false, follow: false },
};

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  // Validated on the server before rendering, so an expired link shows the
  // "ask for a new one" state rather than a form that will fail on submit.
  const check = await checkResetToken(token);

  return <ResetPasswordScreen token={token} valid={check.ok} />;
}
