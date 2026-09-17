import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Fraunces, Inter, Manrope } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { ServiceWorker } from "@/components/ServiceWorker";
// theme.css, not globals.css: renamed on purpose. Vercel's persistent Turbopack
// build cache once served a stale compiled copy of this file (new components,
// old tokens) after a token-only change; a new module path cannot hit that cache.
import "./theme.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

// The display face. Variable axes (opsz, SOFT) are what give the big streak
// numeral its slightly soft, printed look — see font-display in theme.css.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT"],
});

// Display face for the "ocean" look (see theme.css). Loaded once, used only
// when that look is active.
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });

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
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Theme: a saved preference (qt-theme = light|dark) wins, otherwise the OS.
 * Runs before first paint (no flash) and keeps the <html> class in sync live
 * when the system switches. Mirrors src/lib/theme.ts exactly.
 */
const themeScript = `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');var e=document.documentElement;var a=function(){var p=null;try{p=localStorage.getItem('qt-theme')}catch(x){}var d=p==='dark'||(p!=='light'&&m.matches);e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';};var L=['paper','mono','ocean','plum'];var q=null;try{q=new URLSearchParams(location.search).get('look')}catch(x){}var k=null;try{if(q&&L.indexOf(q)>=0){localStorage.setItem('qt-look',q)}k=localStorage.getItem('qt-look')}catch(x){}if(k&&L.indexOf(k)>=0&&k!=='paper'){e.setAttribute('data-look',k)}a();m.addEventListener('change',a);}catch(e){}})();`;

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
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${manrope.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
        <I18nProvider>{children}</I18nProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
