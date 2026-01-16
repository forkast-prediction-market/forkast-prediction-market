import type { ReactNode } from 'react'
import { Providers } from '@/providers/Providers'

export default function TwoFactorLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        {children}
      </main>
    </Providers>
  )
}
