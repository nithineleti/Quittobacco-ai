import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  applicationName: "QuitTobacco",
  title: {
    default: "QuitTobacco — your quit journey",
    template: "%s · QuitTobacco",
  },
  description:
    "A friendly, game-like companion to help you quit tobacco — with real rewards, offline support, and reports from your clinic.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "QuitTobacco" },
  icons: { apple: "/apple-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e1f" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Theme always follows the OS. Runs before first paint (no flash) and keeps the
 * <html> class in sync live when the system switches light/dark.
 */
const themeScript = `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');var e=document.documentElement;var a=function(){e.classList.toggle('dark',m.matches);e.style.colorScheme=m.matches?'dark':'light';};a();m.addEventListener('change',a);}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Set by proxy.ts on every request — the CSP's script-src only allows an
  // inline script that carries this exact value. Next attaches the same
  // nonce to its own generated scripts automatically; this is the one script
  // the app writes itself, so it is the one place that needs it by hand.
  // Reading headers() here also opts every route into dynamic rendering,
  // which a nonce-based CSP requires (a static page has no per-request nonce
  // to embed).
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
        <I18nProvider>{children}</I18nProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
