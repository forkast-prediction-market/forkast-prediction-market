'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import HeaderDropdownUserMenuAuth from '@/components/layout/HeaderDropdownUserMenuAuth'
import HeaderDropdownUserMenuGuest from '@/components/layout/HeaderDropdownUserMenuGuest'
import HeaderNotifications from '@/components/layout/HeaderNotifications'
import HeaderPortfolio from '@/components/layout/HeaderPortfolio'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useClientMounted } from '@/hooks/useClientMounted'
import { useRequireConnection } from '@/hooks/useRequireWalletConnection'
import { authClient } from '@/lib/auth-client'

export default function HeaderMenu() {
  const isMounted = useClientMounted()
  const { open } = useAppKit()
  const { status, address } = useAppKitAccount()
  const { isConnected, isAuthenticated } = useRequireConnection()

  async function handleSignMessage() {
    if (!address)
      return

    try {
      // Get nonce from Better Auth
      const nonceResponse = await authClient.siwe.nonce({
        walletAddress: address,
      })

      if (nonceResponse.error) {
        console.error('Error getting nonce:', nonceResponse.error)
        return
      }

      // This will trigger the SIWE flow
      console.log('Nonce received, SIWE flow should be triggered by AppKit')
    }
    catch (error) {
      console.error('Error with SIWE flow:', error)
    }
  }

  if (!isMounted || status === 'connecting') {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-9 w-16 rounded" />
        <Skeleton className="h-9 w-20 rounded" />
        <Skeleton className="h-9 w-20 rounded" />
      </div>
    )
  }

  // Conectado e autenticado
  if (isConnected && isAuthenticated) {
    return (
      <>
        <HeaderPortfolio />
        <HeaderNotifications />
        <HeaderDropdownUserMenuAuth />
      </>
    )
  }

  // Conectado mas não autenticado
  if (isConnected && !isAuthenticated) {
    return (
      <Button onClick={handleSignMessage}>
        Assinar Mensagem
      </Button>
    )
  }

  // Não conectado
  return (
    <>
      <Button variant="link" onClick={() => open()}>Log In</Button>
      <Button onClick={() => open()}>Sign Up</Button>
      <HeaderDropdownUserMenuGuest />
    </>
  )
}
