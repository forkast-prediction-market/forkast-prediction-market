'use client'

import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ThemeProvider } from 'next-themes'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import { Toaster } from '@/components/ui/sonner'
import AppKitProvider from '@/providers/AppKitProvider'
import ProgressIndicatorProvider from '@/providers/ProgressIndicatorProvider'

const queryClient = new QueryClient()

export function Providers({ children, cookies }: { children: ReactNode, cookies: string | null }) {
  return (
    <ProgressIndicatorProvider>
      <ThemeProvider attribute="class">
        <QueryClientProvider client={queryClient}>
          <AppKitProvider cookies={cookies}>
            <div className="min-h-screen bg-background">
              {children}
            </div>
            <Toaster position="top-center" />
            {process.env.NODE_ENV === 'production' && <SpeedInsights />}
            {process.env.NODE_ENV === 'production' && <GoogleAnalytics />}
          </AppKitProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ProgressIndicatorProvider>
  )
}
