'use client'

import { BellIcon } from 'lucide-react'
import { useState } from 'react'
import { LoginModal } from '@/components/auth/LoginModal'
import HeaderLogo from '@/components/layout/HeaderLogo'
import HeaderSearch from '@/components/layout/HeaderSearch'
import HeaderUserMenuGuest from '@/components/layout/HeaderUserMenuGuest'
import { Button } from '@/components/ui/button'

import { useAuth } from '@/hooks/useAuth'
import { mockUser } from '@/lib/mockData'

export default function Header() {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const { user, isInitialized } = useAuth()

  return (
    <header className="sticky top-0 z-50 bg-background pt-2">
      <div className="container flex h-14 items-center">
        <HeaderLogo />
        <HeaderSearch />

        {/* Right Section */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">
          {/* Portfolio & Cash - Hidden on mobile, only visible when logged in */}
          {user && (
            <div className="hidden items-center gap-6 text-xs lg:flex">
              <a
                href="#"
                className="rounded-lg p-2 text-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div className="font-medium text-muted-foreground">Portfolio</div>
                <div className="text-sm font-semibold text-primary">
                  $
                  {mockUser.portfolio.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </a>
              <a
                href="#"
                className="rounded-lg p-2 text-center transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div className="font-medium text-muted-foreground">Cash</div>
                <div className="text-sm font-semibold text-primary">
                  $
                  {mockUser.cash.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </a>
            </div>
          )}
          {/* Deposit/Connect Button - Hidden on small mobile */}
          {!isInitialized
            ? (
                <Button size="sm" className="hidden sm:inline-flex" disabled>
                  Loading...
                </Button>
              )
            : user
              ? (
                  <Button
                    size="sm"
                    className="hidden sm:inline-flex"
                    onClick={() => setShowLoginModal(true)}
                  >
                    Deposit
                  </Button>
                )
              : (
                  <Button
                    size="sm"
                    className="hidden sm:inline-flex"
                    onClick={() => setShowLoginModal(true)}
                  >
                    Connect
                  </Button>
                )}

          {/* Notifications */}
          <Button type="button" size="icon" variant="ghost">
            <BellIcon />
          </Button>

          <HeaderUserMenuGuest setShowLoginModal={setShowLoginModal} />
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </header>
  )
}
