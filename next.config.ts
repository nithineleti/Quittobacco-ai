import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Baseline security headers. Applied to every route.
 *
 * Note there is no `script-src` here. A strict script CSP needs a per-request
 * nonce, which forces every page to render dynamically and would have to be
 * threaded through the inline theme script in `app/layout.tsx`. The clickjacking
 * protection below is the part that actually matters for a login form, and it
 * needs no nonce. See README → "Security" for the follow-up.
 */
const securityHeaders = [
  // Clickjacking: stop the app being framed and click-hijacked. `frame-ancestors`
  // is the modern rule; X-Frame-Options covers older browsers.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  // Don't let a response be re-interpreted as a different content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Never leak the full URL (which can carry ?next=) to third-party origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // `camera=(self)` is deliberate: the oral-health scan uses a file input with
  // capture="environment". Locking it would break a core feature.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=()",
  },
  // HSTS only in production — sending it in dev would pin the browser to HTTPS
  // for localhost and the LAN address used for phone testing, breaking both.
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Pin the workspace root (a stray lockfile in the home dir confuses inference).
  turbopack: { root: import.meta.dirname },
  // Don't advertise the framework and version to attackers.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
