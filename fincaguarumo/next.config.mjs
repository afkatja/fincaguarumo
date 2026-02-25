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
      // Redirect villa-bruno and accommodation to stay
      // {
      //   source: "/villa-bruno",
      //   destination: "/stay",
      //   permanent: true,
      // },
      // {
      //   source: "/accommodation",
      //   destination: "/stay",
      //   permanent: true,
      // },
      // // Redirect localized villa-bruno and accommodation to stay
      // {
      //   source: "/es/villa-bruno",
      //   destination: "/es/stay",
      //   permanent: true,
      // },
      // {
      //   source: "/es/accommodation",
      //   destination: "/es/stay",
      //   permanent: true,
      // },
      // {
      //   source: "/nl/villa-bruno",
      //   destination: "/nl/stay",
      //   permanent: true,
      // },
      // {
      //   source: "/nl/accommodation",
      //   destination: "/nl/stay",
      //   permanent: true,
      // },
      // {
      //   source: "/de/villa-bruno",
      //   destination: "/de/stay",
      //   permanent: true,
      // },
      // {
      //   source: "/de/accommodation",
      //   destination: "/de/stay",
      //   permanent: true,
      // },
      // {
      //   source: "/ru/villa-bruno",
      //   destination: "/ru/stay",
      //   permanent: true,
      // },
      // {
      //   source: "/ru/accommodation",
      //   destination: "/ru/stay",
      //   permanent: true,
      // },
      // Redirect non-English blog pages to English
      {
        source: "/es/blog",
        destination: "/en/blog",
        permanent: true,
      },
      {
        source: "/ru/blog",
        destination: "/en/blog",
        permanent: true,
      },
      {
        source: "/de/blog",
        destination: "/en/blog",
        permanent: true,
      },
      {
        source: "/nl/blog",
        destination: "/en/blog",
        permanent: true,
      },
      // Redirect non-English blog posts to English
      {
        source: "/es/blog/:slug*",
        destination: "/en/blog/:slug*",
        permanent: true,
      },
      {
        source: "/ru/blog/:slug*",
        destination: "/en/blog/:slug*",
        permanent: true,
      },
      {
        source: "/de/blog/:slug*",
        destination: "/en/blog/:slug*",
        permanent: true,
      },
      {
        source: "/nl/blog/:slug*",
        destination: "/en/blog/:slug*",
        permanent: true,
      },
    ]
  },
}

const withNextIntl = createNextIntlPlugin()

const withBundleOptimizer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

export default withBundleOptimizer(withNextIntl(nextConfig))
