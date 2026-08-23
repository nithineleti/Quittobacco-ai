import { AccountSync } from "@/components/AccountSync";
import { StateSync } from "@/components/StateSync";
import { AppShell } from "@/components/feature/AppShell";
import { getCurrentUser } from "@/lib/auth/dal";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defence in depth: the proxy already redirects signed-out visitors, but this
  // check runs next to the data and does not depend on the proxy running at all
  // — which matters on hosts whose Next.js runtime may not support proxy.ts.
  const user = await getCurrentUser();

  return (
    <>
      <AccountSync
        displayName={user.display_name ?? undefined}
        language={user.language}
      />
      {/* Backs the quit journey up to the account and restores it on a new
          device. Mounted here so it covers every signed-in screen. */}
      <StateSync />
      <AppShell>{children}</AppShell>
    </>
  );
}
