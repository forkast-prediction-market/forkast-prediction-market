'use client'

import { useEffect } from 'react'
import HeaderLogo from '@/components/HeaderLogo'
import { authClient } from '@/lib/auth-client'
import { clearBrowserStorage, clearNonHttpOnlyCookies } from '@/lib/utils'

export default function TwoFactorAbortPage() {
  useEffect(() => {
    let isActive = true

    async function clearAuthState() {
      try {
        await authClient.signOut()
      }
      catch {
        //
      }

      try {
        await fetch('/2fa/cancel', { credentials: 'include' })
      }
      catch {
        //
      }

      clearBrowserStorage()
      clearNonHttpOnlyCookies()

      if (isActive) {
        window.location.href = '/'
      }
    }

    void clearAuthState()

    return () => {
      isActive = false
    }
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12 text-sm text-muted-foreground">
      <HeaderLogo />
    </main>
  )
}
