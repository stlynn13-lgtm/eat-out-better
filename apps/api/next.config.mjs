/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE on upload size: /api/analyze is a route handler, and Vercel enforces
  // a hard ~4.5MB request-body limit on route handlers at the platform level.
  // No Next.js config can raise it (`serverActions.bodySizeLimit` only applies
  // to Server Actions and previously lived here giving false confidence).
  // The mobile client compresses to a total-upload budget under that ceiling —
  // see apps/mobile/lib/utils/image.ts.

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
