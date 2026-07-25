import type { Metadata } from "next";
import { Leaf } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Offline" };

// Standalone (no app shell) so it renders with zero JS / zero network.
export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="grid size-14 place-items-center rounded-pill bg-primary text-primary-fg">
          <Leaf className="size-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold text-fg">You&rsquo;re offline</h1>
        <p className="max-w-xs text-base text-muted">
          Your saved progress is safe on this device. Craving rescue and breathing still work.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href="/sos" className={buttonClasses()}>
            Open craving rescue
          </a>
          <a href="/dashboard" className={buttonClasses({ variant: "secondary" })}>
            Home
          </a>
        </div>
      </div>
    </main>
  );
}
