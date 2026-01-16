import type { ReactNode } from 'react'
import TwoFactorProviders from '@/app/2fa/_components/TwoFactorProviders'

export default function TwoFactorLayout({ children }: { children: ReactNode }) {
  return (
    <TwoFactorProviders>
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        {children}
      </main>
    </TwoFactorProviders>
  )
}
