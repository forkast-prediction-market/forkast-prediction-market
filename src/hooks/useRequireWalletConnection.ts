'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useClientMounted } from '@/hooks/useClientMounted'

export function useRequireConnection() {
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

  return { isConnected }
}
