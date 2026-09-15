import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * Chrome for every admin-panel page. Gated here as well as in each page: a
 * layout renders alongside its page, so without this a non-operator would see
 * the admin header framing a 404 — which confirms the panel exists.
 * requireAdmin() is request-cached, so the second check is free.
 */
export default async function BackendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-5">
          {/* Wordmark only from tablet up: on a phone it plus the badge plus two
              nav links is more than 390px holds without wrapping. */}
          <Link href="/backend" className="rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="sm:hidden"><Brand iconOnly /></span>
            <span className="hidden sm:block"><Brand /></span>
          </Link>
          <span className="whitespace-nowrap rounded-pill bg-tile-amber px-3 py-1 text-xs font-bold uppercase tracking-wide text-tile-amber-fg">
            Admin panel
          </span>
          <nav className="ml-auto flex items-center gap-1 text-sm font-semibold">
            <Link
              href="/backend"
              className="flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-fg hover:bg-surface-2"
            >
              <Icon name="Users" className="size-4" />
              Patients
            </Link>
            <Link
              href="/dashboard"
              className="flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-muted hover:bg-surface-2 hover:text-fg"
            >
              <Icon name="ChevronLeft" className="size-4" />
              <span className="hidden sm:inline">Back to app</span>
              <span className="sm:hidden">App</span>
            </Link>
          </nav>
          <span className="hidden text-xs text-muted sm:block">{admin.email}</span>
        </div>
      </header>
      {children}
    </div>
  );
}
