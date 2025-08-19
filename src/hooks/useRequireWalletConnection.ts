'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useClientMounted } from '@/hooks/useClientMounted'

export function useRequireConnection() {
  const { isConnected, status, address } = useAppKitAccount()
  const { open } = useAppKit()
  const router = useRouter()
  const isMounted = useClientMounted()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check SIWE authentication status
  useEffect(() => {
    async function checkAuthentication() {
      if (isConnected && address) {
        try {
          const res = await fetch('/api/auth/session', { credentials: 'include' })
          const data = await res.json()
          setIsAuthenticated(!!data.user)
        }
        catch {
          setIsAuthenticated(false)
        }
      }
      else {
        setIsAuthenticated(false)
      }
    }

    checkAuthentication()
  }, [isConnected, address])

  useEffect(() => {
    if (isMounted && status === 'disconnected') {
      queueMicrotask(() => open())
      router.replace('/')
    }
  }, [status, isMounted, open, router])

  return {
    isConnected,
    isAuthenticated: isConnected && isAuthenticated,
    address,
  }
}
