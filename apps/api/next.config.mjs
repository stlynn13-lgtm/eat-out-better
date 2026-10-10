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

  // Security headers. The API serves JSON plus three static pages (/privacy,
  // /terms, /support) that need no JavaScript at all, so the CSP blocks
  // scripts outright (script-src 'none'): XSS is then impossible on these
  // pages whatever ends up in them.
  //   - Verified 2026-10-04 in Chromium: all three pages render fully. The
  //     console shows "Refused to load the script" for Next's runtime chunks;
  //     that is expected and harmless — the HTML is already server-rendered.
  //   - Do NOT use the plain `default-src 'self'` here: it lets Next's runtime
  //     load but blocks its inline RSC payload, and the page then hydrates to
  //     a BLANK screen (tested). Either no scripts, or nonces via middleware.
  //   - If a page ever needs client JS, move to per-request nonces rather
  //     than adding 'unsafe-inline' to script-src.
  //   - style-src allows inline styles: the pages use React style={{}} props.
  // X-XSS-Protection is gone on purpose: browsers removed the XSS auditor and
  // "1; mode=block" could itself be abused for cross-site leaks.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline'; " +
              "frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'",
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
