'use client'

import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import dynamic from 'next/dynamic'
import { Toaster } from '@/components/ui/sonner'
import AppKitProvider from '@/providers/AppKitProvider'
import ProgressIndicatorProvider from '@/providers/ProgressIndicatorProvider'

const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then(mod => mod.SpeedInsights),
  { ssr: false },
)
const GoogleAnalytics = dynamic(
  () => import('@/components/GoogleAnalytics'),
  { ssr: false },
)

const queryClient = new QueryClient()

interface AppProvidersProps {
  children: ReactNode
  disableAppKit?: boolean
}

export function AppProviders({ children, disableAppKit }: AppProvidersProps) {
  const shouldLoadAppKit = !disableAppKit

  const content = (
    <div className="min-h-screen bg-background">
      {children}
      <Toaster position="bottom-left" />
      {process.env.NODE_ENV === 'production' && <SpeedInsights />}
      {process.env.NODE_ENV === 'production' && <GoogleAnalytics />}
    </div>
  )

  return (
    <ProgressIndicatorProvider>
      <ThemeProvider attribute="class">
        <QueryClientProvider client={queryClient}>
          {shouldLoadAppKit
            ? (
                <AppKitProvider>
                  {content}
                </AppKitProvider>
              )
            : (
                content
              )}
        </QueryClientProvider>
      </ThemeProvider>
    </ProgressIndicatorProvider>
  )
}
