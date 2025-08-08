'use client'

import { BellIcon, ChevronDownIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { LoginModal } from '@/components/auth/LoginModal'
import HeaderLogo from '@/components/layout/HeaderLogo'
import HeaderSearch from '@/components/layout/HeaderSearch'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { mockUser } from '@/lib/mockData'

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user, disconnect, isInitialized } = useAuth()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current
        && !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showUserMenu])

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
          <button type="button" className="p-1 text-muted-foreground hover:text-foreground">
            <BellIcon className="size-5" />
          </button>
          {/* User Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1 p-1 text-muted-foreground hover:text-foreground"
            >
              <Image
                src="https://avatar.vercel.sh/user.png"
                alt="User avatar"
                width={24}
                height={24}
                className="rounded-full"
              />
              <ChevronDownIcon className="size-3" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border bg-background py-2 shadow-lg">
                {user
                  ? (
                      <>
                        <div className="border-b px-3 py-2">
                          <p className="text-xs text-muted-foreground">
                            Connected as
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {`${user.address.slice(0, 6)}...${user.address.slice(
                              -4,
                            )}`}
                          </p>
                        </div>

                        <div className="space-y-1 p-1">
                          <MenuLink label="Profile" />
                          <MenuLink label="Settings" />
                          <MenuLink label="Watchlist" />
                          <MenuLink label="Rewards" />

                          <div className="my-1 border-t"></div>

                          <MenuLink label="Documentation" />
                          <MenuLink label="Terms of Use" />

                          <div className="my-1 border-t"></div>

                          {/* Theme Selector */}
                          <div className="flex items-center justify-between px-3 py-1.5">
                            <div className="text-xs text-foreground">Theme</div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTheme('light')
                                }}
                                className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
                                  theme === 'light'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                }`}
                                title="Light mode"
                              >
                                <SunIcon className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTheme('system')
                                }}
                                className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
                                  theme === 'system'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                }`}
                                title="System mode"
                              >
                                <MonitorIcon className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setTheme('dark')
                                }}
                                className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
                                  theme === 'dark'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                }`}
                                title="Dark mode"
                              >
                                <MoonIcon className="size-3.5" />
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={disconnect}
                            className={`
                              flex w-full cursor-pointer items-center justify-between rounded px-3 py-1.5 text-left
                              text-xs text-foreground
                              hover:bg-accent
                            `}
                          >
                            Logout
                          </button>
                        </div>
                      </>
                    )
                  : (
                      <div className="space-y-1 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowLoginModal(true)
                            setShowUserMenu(false)
                          }}
                          className={`
                            flex w-full cursor-pointer items-center justify-between rounded px-3 py-1.5 text-left
                            text-xs text-foreground
                            hover:bg-accent
                          `}
                        >
                          Sign Up
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowLoginModal(true)
                            setShowUserMenu(false)
                          }}
                          className={`
                            flex w-full cursor-pointer items-center justify-between rounded px-3 py-1.5 text-left
                            text-xs text-foreground
                            hover:bg-accent
                          `}
                        >
                          Log In
                        </button>

                        <div className="my-1 border-t"></div>
                        <MenuLink label="Rewards" />
                        <MenuLink label="Documentation" />
                        <MenuLink label="Terms of Use" />

                        <div className="my-1 border-t"></div>

                        {/* Theme Selector */}
                        <div className="flex items-center justify-between px-3 py-1.5">
                          <div className="text-xs text-foreground">Theme</div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setTheme('light')
                              }}
                              className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
                                theme === 'light'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                              }`}
                              title="Light mode"
                            >
                              <SunIcon className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setTheme('system')
                              }}
                              className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
                                theme === 'system'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                              }`}
                              title="System mode"
                            >
                              <MonitorIcon className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setTheme('dark')
                              }}
                              className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
                                theme === 'dark'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                              }`}
                              title="Dark mode"
                            >
                              <MoonIcon className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
              </div>
            )}
          </div>
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

function MenuLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      className={`
        flex w-full cursor-pointer items-center justify-between rounded px-3 py-1.5 text-left text-xs text-foreground
        hover:bg-accent
      `}
    >
      {label}
    </button>
  )
}
