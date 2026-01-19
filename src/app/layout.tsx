import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import IntlProvider from '@/components/IntlProvider'
import TestModeBanner from '@/components/TestModeBanner'
import { defaultLocale } from '@/i18n/locales'
import { openSauceOne } from '@/lib/fonts'
import { IS_TEST_MODE } from '@/lib/network'
import { svgLogoUri } from '@/lib/utils'
import './globals.css'

const siteIcon = svgLogoUri()

export const metadata: Metadata = {
  title: {
    template: `${process.env.NEXT_PUBLIC_SITE_NAME} | %s`,
    default: `${process.env.NEXT_PUBLIC_SITE_NAME} | ${process.env.NEXT_PUBLIC_SITE_DESCRIPTION}`,
  },
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
  applicationName: process.env.NEXT_PUBLIC_SITE_NAME,
  icons: {
    icon: siteIcon,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1e293b' },
  ],
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={defaultLocale} className={`${openSauceOne.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <Suspense fallback={null}>
          <IntlProvider>
            {IS_TEST_MODE && <TestModeBanner />}
            {children}
          </IntlProvider>
        </Suspense>
      </body>
    </html>
  )
}
