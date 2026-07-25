import type { Metadata, Viewport } from "next";
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
    "A calm, game-like companion to help you quit tobacco — with real rewards, offline support, and oral-health tracking.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "QuitTobacco" },
  icons: { apple: "/apple-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#131611" },
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <I18nProvider>{children}</I18nProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
