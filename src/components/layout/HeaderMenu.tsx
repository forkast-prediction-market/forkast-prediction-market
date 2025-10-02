'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { createAuthClient } from 'better-auth/react'
import { router } from 'next/client'
import { useEffect } from 'react'
import HeaderDropdownUserMenuAuth from '@/components/layout/HeaderDropdownUserMenuAuth'
import HeaderDropdownUserMenuGuest from '@/components/layout/HeaderDropdownUserMenuGuest'
import HeaderNotifications from '@/components/layout/HeaderNotifications'
import HeaderPortfolio from '@/components/layout/HeaderPortfolio'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useClientMounted } from '@/hooks/useClientMounted'
import { authClient } from '@/lib/auth-client'
import { useUser } from '@/stores/useUser'

const { useSession } = createAuthClient()

export default function HeaderMenu() {
  const isMounted = useClientMounted()
  const { open } = useAppKit()
  const { isConnected, status } = useAppKitAccount()
  const { data: session } = useSession()

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (status === 'connecting') {
        await authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              Object.keys(localStorage).forEach((key) => {
                if (key.startsWith('@appkit')) {
                  localStorage.removeItem(key)
                }
              })
              router.push('/')
            },
          },
        })
      }
    }, 20000)

    return () => clearTimeout(timeout)
  }, [status])

  useEffect(() => {
    if (session?.user) {
      useUser.setState(session.user)
    }
    else {
      useUser.setState(null)
    }
  }, [session?.user])

  if (!isMounted || status === 'connecting') {
    return (
      <div className="flex gap-2">
        <Skeleton className="hidden h-9 w-20 lg:block" />
        <Skeleton className="hidden h-9 w-20 lg:block" />
        <Skeleton className="h-9 w-10" />
        <Skeleton className="h-9 w-20" />
      </div>
    )
  }

  return (
    <>
      {isConnected && (
        <>
          <HeaderPortfolio />
          <HeaderNotifications />
          <HeaderDropdownUserMenuAuth />
        </>
      )}

      {!isConnected && (
        <>
          <Button
            size="sm"
            variant="link"
            data-testid="header-login-button"
            onClick={() => open()}
          >
            Log In
          </Button>
          <Button
            size="sm"
            data-testid="header-signup-button"
            onClick={() => open()}
          >
            Sign Up
          </Button>
          <HeaderDropdownUserMenuGuest />
        </>
      )}
    </>
  )
}
