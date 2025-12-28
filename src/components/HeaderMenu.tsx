'use client'

import type { User } from '@/types'
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
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTradingOnboarding } from '@/providers/TradingOnboardingProvider'
import { useUser } from '@/stores/useUser'

const { useSession } = createAuthClient()

export default function HeaderMenu() {
  const isMounted = useClientMounted()
  const { open, isReady } = useAppKit()
  const { isConnected, status } = useAppKitAccount()
  const { data: session } = useSession()
  const isMobile = useIsMobile()
  const { startDepositFlow } = useTradingOnboarding()

  useEffect(() => {
    if (session?.user) {
      const sessionSettings = (session.user as Partial<User>).settings
      useUser.setState((previous) => {
        if (!previous) {
          return { ...session.user, image: session.user.image ?? '' }
        }

        return {
          ...previous,
          ...session.user,
          image: session.user.image ?? previous.image ?? '',
          settings: {
            ...(previous.settings ?? {}),
            ...(sessionSettings ?? {}),
          },
        }
      })
    }
    else {
      useUser.setState(null)
    }
  }, [session?.user])

  if (!isMounted || status === 'connecting' || !isReady) {
    return (
      <div className="flex gap-2">
        <Skeleton className="hidden h-9 w-20 lg:block" />
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
          {!isMobile && <HeaderPortfolio />}
          {!isMobile && (
            <Button size="sm" onClick={startDepositFlow}>
              Deposit
            </Button>
          )}
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
