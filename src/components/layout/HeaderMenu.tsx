'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useEffect, useState } from 'react'
import HeaderDropdownUserMenuAuth from '@/components/layout/HeaderDropdownUserMenuAuth'
import HeaderDropdownUserMenuGuest from '@/components/layout/HeaderDropdownUserMenuGuest'
import HeaderNotifications from '@/components/layout/HeaderNotifications'
import HeaderPortfolio from '@/components/layout/HeaderPortfolio'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function HeaderMenu() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { open } = useAppKit()
  const { isConnected, status } = useAppKitAccount()

  if (!mounted || status === 'connecting') {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-9 w-16 rounded" />
        <Skeleton className="h-9 w-20 rounded" />
        <Skeleton className="h-9 w-20 rounded" />
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
          <Button variant="link" onClick={() => open()}>Log In</Button>
          <Button onClick={() => open()}>Sign Up</Button>
          <HeaderDropdownUserMenuGuest />
        </>
      )}
    </>
  )
}
