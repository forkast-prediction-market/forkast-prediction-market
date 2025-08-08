'use client'

import { useState } from 'react'
import { LoginModal } from '@/components/auth/LoginModal'
import HeaderDeposit from '@/components/layout/HeaderDeposit'
import HeaderDropdownUserMenuAuth from '@/components/layout/HeaderDropdownUserMenuAuth'
import HeaderDropdownUserMenuGuest from '@/components/layout/HeaderDropdownUserMenuGuest'
import HeaderNotifications from '@/components/layout/HeaderNotifications'
import HeaderPortfolio from '@/components/layout/HeaderPortfolio'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export default function HeaderMenu() {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const { user } = useAuth()

  return (
    <>
      {user && (
        <>
          <HeaderPortfolio />
          <HeaderDeposit />
          <HeaderNotifications />
          <HeaderDropdownUserMenuAuth />
        </>
      )}

      {!user && (
        <>
          <Button variant="link" onClick={() => setShowLoginModal(true)}>Log In</Button>
          <Button onClick={() => setShowLoginModal(true)}>Sign Up</Button>
          <HeaderDropdownUserMenuGuest setShowLoginModal={setShowLoginModal} />
          <LoginModal
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
          />
        </>
      )}
    </>
  )
}
