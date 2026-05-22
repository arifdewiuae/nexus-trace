import type { NextConfig } from "next"

const SELF = "'self'"
const UNSAFE_INLINE = "'unsafe-inline'"
const UNSAFE_EVAL = "'unsafe-eval'"
// Vercel Analytics + Speed Insights load their script and send beacons here.
// (In production on Vercel these are proxied same-origin via /_vercel/*, but the
// dev/self-hosted scripts come straight from this domain.)
const VERCEL_INSIGHTS = "https://va.vercel-scripts.com"
const isDev = process.env.NODE_ENV === "development"

const csp = [
  `default-src ${SELF}`,
  // React dev mode requires eval() for stack-trace reconstruction; omitted in production
  `script-src ${SELF} ${UNSAFE_INLINE} ${VERCEL_INSIGHTS}${isDev ? ` ${UNSAFE_EVAL}` : ""}`,
  `style-src ${SELF} ${UNSAFE_INLINE}`,    // Tailwind inline styles
  `font-src ${SELF}`,
  `img-src ${SELF} data:`,
  `connect-src ${SELF} ${VERCEL_INSIGHTS}`, // SSE to /api/chat (same-origin); Vercel insights beacons
  `frame-ancestors 'none'`,
].join("; ")

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
]

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Restrict /api/* to same-origin requests only
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "same-origin" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
        ],
      },
    ]
  },
}

export default nextConfig
