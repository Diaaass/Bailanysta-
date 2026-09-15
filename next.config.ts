import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * `unsafe-inline` for scripts is the compromise here: Next.js ships hydration
 * data and the theme bootstrap as inline <script> tags. Removing it needs a
 * per-request nonce threaded through the proxy and every inline script, which
 * is worth doing for a product handling real data and is overkill here — the
 * trade-off is written down in docs/decisions/0008.
 *
 * `unsafe-eval` is development only: Turbopack's HMR needs it, production does
 * not.
 */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // The AI provider is called from the server, never from the browser, so the
  // page itself only ever talks back to its own origin.
  `connect-src 'self'${isDev ? " ws: http://localhost:*" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // frame-ancestors already covers this; kept for browsers that predate CSP 2.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
