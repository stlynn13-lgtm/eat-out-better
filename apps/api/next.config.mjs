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
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

export default nextConfig;
