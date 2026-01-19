'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import IntlProvider from '@/components/IntlProvider'
import { Toaster } from '@/components/ui/sonner'

export default function TwoFactorProviders({ children }: { children: ReactNode }) {
  return (
    <IntlProvider>
      <ThemeProvider attribute="class">
        <div className="min-h-screen bg-background">
          {children}
        </div>
        <Toaster position="bottom-left" />
      </ThemeProvider>
    </IntlProvider>
  )
}
