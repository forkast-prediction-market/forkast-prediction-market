import type { ReactNode } from 'react'
import { AppProviders } from '@/providers/AppProviders'

export default function TwoFactorLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders disableAppKit>
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        {children}
      </main>
    </AppProviders>
  )
}
