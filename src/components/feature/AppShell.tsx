"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", icon: "Home", key: "home" },
  { href: "/learn", icon: "BookOpen", key: "learn" },
  { href: "/rewards", icon: "Gift", key: "rewards" },
  { href: "/progress", icon: "TrendingUp", key: "progress" },
  { href: "/profile", icon: "User", key: "profile" },
] as const;

// Mobile-only layout: the same phone-width view at every screen size. On larger
// screens the app centres as a framed column (a hairline border on the sides),
// never a desktop sidebar.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-dvh">
      {/* Phone-width app column */}
      <div className="relative mx-auto min-h-dvh w-full max-w-md sm:border-x sm:border-border">
        <main className="px-4 pb-28 pt-4">{children}</main>
      </div>

      {/* Persistent SOS button — one tap from anywhere, aligned to the column */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex">
        <div className="mx-auto flex w-full max-w-md justify-end px-4">
          <Link
            href="/sos"
            aria-label={t("nav.sos")}
            className="pointer-events-auto flex min-h-14 items-center gap-2 rounded-pill bg-primary px-5 text-base font-semibold text-primary-fg shadow-float hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Icon name="LifeBuoy" className="size-6" />
            {t("nav.sos")}
          </Link>
        </div>
      </div>

      {/* Bottom nav — centred to the phone column */}
      <nav
        className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border bg-card sm:border-x"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex">
          {NAV.map((item) => (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  isActive(item.href) ? "text-primary" : "text-muted",
                )}
              >
                <Icon name={item.icon} className="size-6" />
                {t(`nav.${item.key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
