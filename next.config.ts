import type { NextConfig } from "next";

const ADMIN = "/admin";

const baseSecurity = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

// Strict CSP for the admin area: same-origin only, no framing, no external connections.
// 'unsafe-inline' is kept for scripts/styles because Next.js emits inline bootstrap code; everything else is locked down.
const adminCsp =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

// CSP for the student site. 'unsafe-inline' stays for scripts/styles because Next.js emits inline bootstrap code and the
// theme script runs before paint. 'wasm-unsafe-eval' + worker-src let the opt-in in-browser compiler (WebAssembly in a Web
// Worker) run; its files are SHA-256 checked and may only be fetched from this site or the two pinned mirrors.
const siteCsp =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; " +
  "connect-src 'self' https://binji.github.io https://cdn.jsdelivr.net; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: [...baseSecurity, { key: "Content-Security-Policy", value: siteCsp }] },
      {
        source: `${ADMIN}/:path*`,
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "no-store" },
          { key: "Content-Security-Policy", value: adminCsp },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // Lesson pages are rendered per request (so locked lessons are never in static HTML), then cached by Vercel's CDN
        // for only 10 s: a lock/unlock reaches students within seconds, and a class opening the site together is one render.
        source: "/:week(week-[0-9]+)/:slug*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Vercel-CDN-Cache-Control", value: "s-maxage=10, stale-while-revalidate=30" },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
