/** @type {import('next').NextConfig} */

import createNextIntlPlugin from 'next-intl/plugin';
import withBundleAnalyzer from '@next/bundle-analyzer'

const nextConfig = {
  experimental: {
    taint: true,
    optimizePackageImports: ['gsap', 'lucide-react'],
  },
  images: {
    qualities: [50, 75, 100],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
      },
      {
        protocol: 'http',
        hostname: '**.wikipedia.org',
        port: '',
      },
      {
        protocol: 'https',
        hostname: '**.wikipedia.org',
        port: '',
      },
      {
        protocol: 'https',
        hostname: '**.wikimedia.org',
        port: '',
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
    ],
  },
  async rewrites() {
    return [
      {
        source: '/robots.txt',
        destination: '/robots.txt',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/villa-bruno',
        destination: '/stay',
        permanent: true, // 301 redirect for SEO
      },
      // You can also add variations
      {
        source: '/accommodation',
        destination: '/stay',
        permanent: true,
      },
      {
        source: '/eco-villa',
        destination: '/stay',
        permanent: true,
      }
    ]
  }
};

  
 
const withNextIntl = createNextIntlPlugin();

const withBundleOptimizer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withBundleOptimizer(withNextIntl(nextConfig));

