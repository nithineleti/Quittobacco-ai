import { AccountSync } from "@/components/AccountSync";
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
      <AppShell>{children}</AppShell>
    </>
  );
}
