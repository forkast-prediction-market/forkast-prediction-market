'use client'

import { useRequireConnection } from '@/hooks/useRequireWalletConnection'
import SettingsSkeleton from './_components/SettingsSkeleton'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isConnected } = useRequireConnection()

  return (
    <main className="container py-4">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-16">
          {!isConnected && <SettingsSkeleton />}
          {isConnected && children}
        </div>
      </div>
    </main>
  )
}
