import type { NextConfig } from "next";

/**
 * Response headers for the browser app.
 *
 * These are the same protections the API sets on its own responses, applied to
 * the HTML and asset responses that the browser sees first.
 *
 * A `Content-Security-Policy` is deliberately absent. Next.js hydrates with
 * inline scripts, so a policy strict enough to be worth having needs per-request
 * nonces threaded through the framework; shipping `unsafe-inline` to make it
 * parse would be theatre. The platform can set a real CSP at the edge in front
 * of the deployment, which is the layer that can do this properly.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers:
          process.env.NODE_ENV === "production"
            ? // Only once the app is actually served over TLS, matching the API.
              [
                ...securityHeaders,
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains",
                },
              ]
            : securityHeaders,
      },
    ];
  },
};

export default nextConfig;
