'use client'

import { useAppKitAccount } from '@reown/appkit/react'
import { createAuthClient } from 'better-auth/react'
import { useEffect } from 'react'
import HeaderDropdownUserMenuAuth from '@/components/HeaderDropdownUserMenuAuth'
import HeaderDropdownUserMenuGuest from '@/components/HeaderDropdownUserMenuGuest'
import HeaderNotifications from '@/components/HeaderNotifications'
import HeaderPortfolio from '@/components/HeaderPortfolio'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppKit } from '@/hooks/useAppKit'
import { useClientMounted } from '@/hooks/useClientMounted'
import { useUser } from '@/stores/useUser'

const { useSession } = createAuthClient()

export default function HeaderMenu() {
  const isMounted = useClientMounted()
  const { open } = useAppKit()
  const { isConnected, status } = useAppKitAccount()
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user) {
      useUser.setState({ ...session.user, image: session.user.image! })
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
