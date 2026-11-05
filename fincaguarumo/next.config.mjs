/** @type {import('next').NextConfig} */

import createNextIntlPlugin from "next-intl/plugin"
import withBundleAnalyzer from "@next/bundle-analyzer"

const nextConfig = {
  experimental: {
    taint: true,
    optimizePackageImports: ["gsap", "lucide-react"],
    serverActions: {
      allowedOrigins: [
        "https://fincaguarumo.com",
        "https://www.fincaguarumo.com",
        "http://localhost:3000",
        "https://fincaguarumo.local:3000",
      ],
    },
    useTypeScriptCli: true,
  },
  reactCompiler: true,

  allowedDevOrigins: ["http://localhost:3000", "fincaguarumo.local"],
  images: {
    qualities: [50, 75, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
      },
      {
        protocol: "http",
        hostname: "**.wikipedia.org",
        port: "",
      },
      {
        protocol: "https",
        hostname: "**.wikipedia.org",
        port: "",
      },
      {
        protocol: "https",
        hostname: "**.wikimedia.org",
        port: "",
      },

      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "cdn.trustindex.io",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.muscache.com",
      },
      {
        protocol: "https",
        hostname: "*.freebiesupply.com",
      },
      {
        protocol: "https",
        hostname: "*.bstatic.com",
      },
      {
        protocol: "https",
        hostname: "*.myportfolio.com",
      },
      {
        protocol: "https",
        hostname: "*.flickr.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/robots.txt",
        destination: "/robots.txt",
      },
    ]
  },
  async redirects() {
    return [
      // Redirect www to non-www (if needed - handled by Netlify, but good to have)
      // Redirect http to https (handled by HSTS/Netlify)
      // Trailing slash redirects handled by next-intl middleware
      // Blog locale redirects handled in middleware (src/proxy.ts) for reliability
    ]
  },
}

const withNextIntl = createNextIntlPlugin()

const withBundleOptimizer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

export default withBundleOptimizer(withNextIntl(nextConfig))
