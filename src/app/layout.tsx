'use cache'

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import TestModeBanner from '@/components/TestModeBanner'
import { openSauceOne } from '@/lib/fonts'
import { IS_TEST_MODE } from '@/lib/network'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: `${process.env.NEXT_PUBLIC_SITE_NAME} | %s`,
    default: `${process.env.NEXT_PUBLIC_SITE_NAME} | ${process.env.NEXT_PUBLIC_SITE_DESCRIPTION}`,
  },
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
  applicationName: process.env.NEXT_PUBLIC_SITE_NAME,
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1e293b' },
  ],
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${openSauceOne.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        {IS_TEST_MODE && <TestModeBanner />}
        {children}
      </body>
    </html>
  )
}
