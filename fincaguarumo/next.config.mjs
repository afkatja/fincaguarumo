/** @type {import('next').NextConfig} */

import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig = {
  experimental: {
    taint: true,
  },
  images: {
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
    ],
  },
};
 
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);

