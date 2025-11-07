import type { Metadata } from 'next'
import AffiliateWidget from '@/components/affiliate/AffiliateWidget'
import { fetchAffiliateWidgetEvents } from '@/lib/affiliate-widget'

export const metadata: Metadata = {
  title: 'Affiliate Widget',
}

type ThemeSetting = 'light' | 'dark' | 'auto'

interface EmbedPageProps {
  searchParams?: Record<string, string | string[] | undefined>
}

function resolveBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) {
    return 'https://forkast.xyz'
  }
  return raw.startsWith('http') ? raw : `https://${raw}`
}

function getParam(params: EmbedPageProps['searchParams'], key: string) {
  if (!params) {
    return ''
  }

  const value = params[key]
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

function resolveTheme(value: string): ThemeSetting {
  if (value === 'light' || value === 'dark') {
    return value
  }
  return 'auto'
}

export default async function AffiliateWidgetEmbedPage({ searchParams }: EmbedPageProps) {
  const affiliateCode = getParam(searchParams, 'affiliate')?.trim()
  const category = getParam(searchParams, 'category')
  const theme = resolveTheme(getParam(searchParams, 'theme'))

  if (!affiliateCode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent p-6">
        <p className="rounded-xl border border-red-300 bg-white/70 px-4 py-2 text-sm text-red-600">
          Missing "affiliate" query parameter. Append ?affiliate=YOUR_CODE to the iframe src.
        </p>
      </main>
    )
  }

  const events = await fetchAffiliateWidgetEvents({ category, limit: 5 })
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Forkast'
  const logoSvg = process.env.NEXT_PUBLIC_SITE_LOGO_SVG
  const baseUrl = resolveBaseUrl()

  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent p-4">
      <AffiliateWidget
        events={events}
        affiliateCode={affiliateCode}
        baseUrl={baseUrl}
        siteName={siteName}
        logoSvg={logoSvg}
        theme={theme}
      />
    </main>
  )
}
