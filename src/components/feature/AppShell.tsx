"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", icon: "House", key: "home" },
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
        <main className="px-4 pb-32 pt-4">{children}</main>
      </div>

      {/* Persistent SOS button — one tap from anywhere, aligned to the column.
          The only warm-red gradient in the app, so it is unmistakable. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-22 z-40 flex">
        <div className="mx-auto flex w-full max-w-md justify-end px-4">
          <Link
            href="/sos"
            aria-label={t("nav.sos")}
            className="pointer-events-auto flex min-h-14 items-center gap-2 rounded-pill bg-sos-gradient px-5 text-base font-bold shadow-float transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Icon name="LifeBuoy" className="size-6" strokeWidth={2.25} />
            {t("nav.sos")}
          </Link>
        </div>
      </div>

      {/* Bottom nav — centred to the phone column. The active tab gets a
          tinted pill so the current place is obvious at arm's length. */}
      <nav
        className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border/60 bg-card/95 backdrop-blur sm:border-x"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex px-1 pt-1.5 pb-1.5">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-tile text-[0.7rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    active ? "text-accent" : "text-muted hover:text-fg",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-14 place-items-center rounded-pill transition-colors",
                      active && "bg-accent-soft",
                    )}
                  >
                    <Icon
                      name={item.icon}
                      className="size-6"
                      strokeWidth={active ? 2.5 : 2}
                    />
                  </span>
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
