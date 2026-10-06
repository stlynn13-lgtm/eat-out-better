import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE on upload size: /api/analyze is a route handler, and Vercel enforces
  // a hard ~4.5MB request-body limit on route handlers at the platform level.
  // No Next.js config can raise it (`serverActions.bodySizeLimit` only applies
  // to Server Actions and previously lived here giving false confidence).
  // The mobile client compresses to a total-upload budget under that ceiling —
  // see apps/mobile/lib/utils/image.ts.

  // Pin the workspace root explicitly. Without this, Next.js infers it by
  // walking up from this file looking for the outermost lockfile — on this
  // machine that walk escapes the repo entirely and lands on a stray
  // ~/package-lock.json in the home directory, which then makes Next warn
  // about "multiple lockfiles" and silently pick the wrong root. Pointing
  // this at the actual monorepo root (two levels up) makes the build
  // deterministic regardless of what else exists on the machine.
  outputFileTracingRoot: path.join(__dirname, "../.."),

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The API's only pages are the static /privacy, /terms and
          // /support. Nothing should frame them, and nothing on them needs
          // the camera, microphone or location. Next.js inlines its hydration
          // scripts and the pages' styles, hence 'unsafe-inline' for those two:
          // the pages take no user input, so there's nothing to inject, and a
          // nonce would force every page to render dynamically.
          // (X-XSS-Protection is gone: browsers dropped the filter it
          // controlled, and CSP replaces it.)
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
              "style-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
