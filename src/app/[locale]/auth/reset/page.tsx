'use client'

import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'
import HeaderLogo from '@/components/HeaderLogo'
import { authClient } from '@/lib/auth-client'
import { clearBrowserStorage, clearNonHttpOnlyCookies } from '@/lib/utils'

export default function AuthResetPage() {
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
        await fetch('/auth/clear', { credentials: 'include' })
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
    <ThemeProvider attribute="class">
      <main className="flex min-h-screen items-center justify-center px-4 py-12 text-sm text-muted-foreground">
        <HeaderLogo />
      </main>
    </ThemeProvider>
  )
}
