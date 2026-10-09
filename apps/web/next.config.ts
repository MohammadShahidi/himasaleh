import { withSerwist } from '@serwist/turbopack';
import type { NextConfig } from 'next';

// In production Caddy sends /api to the api service. In development, Next proxies it so the
// browser sees one origin and the httpOnly auth cookies just work.
const apiOrigin = process.env['API_INTERNAL_URL'] ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@hm/shared'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
};

export default withSerwist(nextConfig);
