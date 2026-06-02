/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase API route body size limit for image uploads (default 1MB)
  // Each image can be up to 5MB compressed; max 10 images
  experimental: {
    serverActions: {
      bodySizeLimit: "52mb",
    },
  },

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
      // Allow camera access on the capture page
      {
        source: "/capture",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=self",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
