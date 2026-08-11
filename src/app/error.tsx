"use client";

import { useEffect } from "react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";

/**
 * Every authenticated route reads the account from Postgres, so a database
 * outage would otherwise drop the user on Next's raw error page. This keeps the
 * app's voice, and — importantly for a cessation app — points at the SOS route,
 * which works offline and is the one thing a user in a craving cannot wait for.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server details are redacted in production; the digest is the only handle
    // that ties this screen to the server log entry.
    console.error("App error", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <Brand />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-fg">Something went wrong</h1>
        <p className="text-base text-muted">
          We couldn&apos;t load this screen. Your progress is saved on this phone
          and has not been lost.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Button size="lg" full onClick={reset}>
          Try again
        </Button>
        <a
          href="/sos"
          className="min-h-12 text-base font-semibold text-primary underline-offset-4 hover:underline"
        >
          I need help with a craving now
        </a>
      </div>

      {error.digest && (
        <p className="text-xs text-muted">Reference: {error.digest}</p>
      )}
    </main>
  );
}
