import type { NextConfig } from 'next'
import { createMDX } from 'fumadocs-mdx/next'

const config: NextConfig = {
  cacheComponents: true,
  typedRoutes: true,
  reactStrictMode: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/@:username',
        destination: '/:username',
      },
    ]
  },
  env: {
    NEXT_PUBLIC_SITE_URL:
      process.env.VERCEL_ENV === 'production'
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000',
    CLOB_URL: 'https://clob.forka.st',
  },
}

const withMDX = createMDX({
  configPath: 'docs.config.ts',
})

export default withMDX(config)
