import type { NextConfig } from "next";

const API_URL = "https://eat-out-better-api.vercel.app";

// Static pages + Vercel's own analytics scripts. Next injects small inline
// scripts for hydration, so script-src needs 'unsafe-inline' unless we move to
// nonces (which would make every page dynamic and cost the static CDN cache).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // Demo video is self-hosted (public/video). Third-party players stay blocked
  // on purpose: the privacy policy promises no third-party cookies.
  "media-src 'self'",
  "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const headers = [{ source: "/:path*", headers: securityHeaders }];
    // Preview deployments must never be indexed (duplicate content of prod).
    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
      headers.push({
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      });
    }
    return headers;
  },
  async redirects() {
    // The legal pages live on the API project because the app already links
    // there. Redirect rather than copy them: two copies of a privacy policy is
    // how one goes stale. Temporary, so they can move here later without a
    // cached permanent redirect pointing the wrong way.
    return ["privacy", "terms", "support"].map((page) => ({
      source: `/${page}`,
      destination: `${API_URL}/${page}`,
      permanent: false,
    }));
  },
};

export default nextConfig;
