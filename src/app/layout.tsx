'use cache'

import type { Metadata, Viewport } from 'next'
import { openSauceOne } from '@/app/fonts'
import Header from '@/components/layout/Header'
import NavigationTabs from '@/components/layout/NavigationTabs'
import { Providers } from '@/providers/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: `${process.env.NEXT_PUBLIC_SITE_NAME} | %s`,
    default: `${process.env.NEXT_PUBLIC_SITE_NAME} - ${process.env.NEXT_PUBLIC_SITE_DESCRIPTION}`,
  },
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1e293b' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${openSauceOne.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          <Header />
          <NavigationTabs />
          {children}
        </Providers>
      </body>
    </html>
  )
}
