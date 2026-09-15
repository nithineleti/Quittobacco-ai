import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Baseline security headers. Applied to every route.
 *
 * Content-Security-Policy is deliberately NOT set here: the real one — with a
 * nonce-based `script-src`, not just `frame-ancestors` — is generated fresh
 * per request in `src/proxy.ts`, since a static header can't carry a per-request
 * nonce. Proxy's matcher covers every page route this app has, so nothing
 * falls through to needing a fallback CSP here.
 */
const securityHeaders = [
  // X-Frame-Options is the legacy half of the clickjacking protection —
  // frame-ancestors (in proxy.ts's CSP) is the modern rule; this covers
  // browsers old enough to ignore that.
  { key: "X-Frame-Options", value: "DENY" },
  // Don't let a response be re-interpreted as a different content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Never leak the full URL (which can carry ?next=) to third-party origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing in the app captures media any more: images and reports reach a
  // patient only from the clinic, via the admin panel. Locking the camera at
  // the browser level means no future page can quietly reintroduce it.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
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
  experimental: {
    serverActions: {
      // Report uploads from the admin panel go through a Server Action. The
      // default 1 MB would reject most phone photos; 5 MB leaves headroom over
      // the app's own 4 MB per-file cap (document-actions.ts) for multipart
      // framing, and stays under Vercel's 4.5 MB function body limit once the
      // file itself is capped.
      bodySizeLimit: "5mb",
    },
  },
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
