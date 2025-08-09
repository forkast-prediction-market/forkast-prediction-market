'use cache'

import type { Metadata, Viewport } from 'next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { openSauceOne } from '@/app/fonts'
import Header from '@/components/layout/Header'
import NavigationTabs from '@/components/layout/NavigationTabs'
import ProgressIndicator from '@/components/layout/ProgressIndicator'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { SET_THEME_ON_FIRST_LOAD } from '@/lib/utils'
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: SET_THEME_ON_FIRST_LOAD,
          }}
        />
        <title />
      </head>

      <body className="font-sans antialiased">
        <ProgressIndicator>
          <ThemeProvider>
            <div className="min-h-screen bg-background">
              <Header />
              <NavigationTabs />
              {children}
            </div>

            <Toaster />
            {process.env.NODE_ENV === 'production' && <SpeedInsights />}
          </ThemeProvider>
        </ProgressIndicator>
      </body>
    </html>
  )
}
