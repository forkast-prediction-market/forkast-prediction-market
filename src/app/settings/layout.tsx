'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import SettingsSkeleton from '@/app/settings/_components/SettingsSkeleton'
import { useClientMounted } from '@/hooks/useClientMounted'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isConnected, status } = useAppKitAccount()
  const { open } = useAppKit()
  const router = useRouter()
  const isMounted = useClientMounted()

  useEffect(() => {
    if (isMounted && status === 'disconnected') {
      queueMicrotask(() => open())
      router.replace('/')
    }
  }, [status, isMounted, open, router])

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
