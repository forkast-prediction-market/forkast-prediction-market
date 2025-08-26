'use client'

import { SpeedInsights } from '@vercel/speed-insights/next'
import { ThemeProvider } from 'next-themes'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import { Toaster } from '@/components/ui/sonner'
import AppKitProvider from '@/providers/AppKitProvider'
import ProgressIndicatorProvider from '@/providers/ProgressIndicatorProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ProgressIndicatorProvider>
      <ThemeProvider attribute="class">
        <AppKitProvider>
          <div className="min-h-screen bg-background">
            {children}
          </div>
          <Toaster />
          {process.env.NODE_ENV === 'production' && <SpeedInsights />}
          {process.env.NODE_ENV === 'production' && <GoogleAnalytics />}
        </AppKitProvider>
      </ThemeProvider>
    </ProgressIndicatorProvider>
  )
}
