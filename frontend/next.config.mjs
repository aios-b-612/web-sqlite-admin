import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const apiInternal =
  process.env.BUSINESS_API_INTERNAL_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:8080';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: `${apiInternal}/v1/:path*`,
      },
      {
        source: '/health/:path*',
        destination: `${apiInternal}/health/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
