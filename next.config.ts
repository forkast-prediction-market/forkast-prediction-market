import type { NextConfig } from 'next'
import { createMDX } from 'fumadocs-mdx/next'
import createNextIntlPlugin from 'next-intl/plugin'

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
  async rewrites() {
    return [
      {
        source: '/@:username',
        destination: '/:username',
      },
    ]
  },
  env: {
    SITE_URL:
      process.env.VERCEL_ENV === 'production'
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000',
    CLOB_URL: 'https://clob.kuest.com',
    RELAYER_URL: 'https://relayer.kuest.com',
    DATA_URL: 'https://data-api.kuest.com',
    USER_PNL_URL: 'https://user-pnl-api.kuest.com',
    COMMUNITY_URL: 'https://community.kuest.com',
    WS_CLOB_URL: 'wss://ws-subscriptions-clob.kuest.com',
    WS_LIVE_DATA_URL: 'wss://ws-live-data.kuest.com',
  },
}

const withMDX = createMDX({
  configPath: 'docs.config.ts',
})

const withNextIntl = createNextIntlPlugin()

export default withNextIntl(withMDX(config))
