'use client'

import type { Route } from 'next'
import { useDisconnect } from '@reown/appkit-controllers/react'
import { ChevronDownIcon } from 'lucide-react'
import Image from 'next/image'
import { redirect, usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useFilters } from '@/app/[locale]/(platform)/_providers/FilterProvider'
import HeaderPortfolio from '@/components/HeaderPortfolio'
import LocaleSwitcherMenuItem from '@/components/LocaleSwitcherMenuItem'
import ThemeSelector from '@/components/ThemeSelector'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import UserInfoSection from '@/components/UserInfoSection'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Link } from '@/i18n/navigation'
import { useUser } from '@/stores/useUser'

export default function HeaderDropdownUserMenuAuth() {
  const { disconnect } = useDisconnect()
  const { filters, updateFilters } = useFilters()
  const user = useUser()
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => clearCloseTimeout(), [])

  function relatedTargetIsWithin(ref: React.RefObject<HTMLElement | null>, relatedTarget: EventTarget | null) {
    if (!relatedTarget) {
      return false
    }

    return Boolean(ref.current?.contains(relatedTarget as Node))
  }

  function clearCloseTimeout() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  function handleWrapperPointerEnter() {
    clearCloseTimeout()
    setMenuOpen(true)
  }

  function handleWrapperPointerLeave(event: React.PointerEvent) {
    if (relatedTargetIsWithin(wrapperRef, event.relatedTarget)) {
      return
    }

    clearCloseTimeout()
    closeTimeoutRef.current = setTimeout(() => {
      setMenuOpen(false)
    }, 120)
  }

  function handleWatchlistClick() {
    updateFilters({ bookmarked: !filters.bookmarked })
    queueMicrotask(() => redirect('/' as Route))
  }

  function handleMenuClose() {
    setMenuOpen(false)
  }

  if (!user) {
    return <></>
  }

  return (
    <div
      ref={wrapperRef}
      onPointerEnter={handleWrapperPointerEnter}
      onPointerLeave={handleWrapperPointerLeave}
    >
      <DropdownMenu
        key={isAdmin ? 'admin' : 'platform'}
        open={menuOpen}
        onOpenChange={(nextOpen) => {
          clearCloseTimeout()
          setMenuOpen(nextOpen)
        }}
        modal={false}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="header"
            className={`
              group flex cursor-pointer items-center gap-2 px-2 transition-colors
              hover:bg-accent/70 hover:text-accent-foreground
              data-[state=open]:bg-accent/70 data-[state=open]:text-accent-foreground
            `}
            data-testid="header-menu-button"
          >
            <Image
              src={user.image}
              alt="User avatar"
              width={32}
              height={32}
              className="aspect-square shrink-0 rounded-full object-cover"
            />
            <ChevronDownIcon className={`
              size-4 transition-transform duration-150
              group-hover:rotate-180
              group-data-[state=open]:rotate-180
            `}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-64"
          sideOffset={0}
          collisionPadding={16}
          portalled={false}
          onInteractOutside={() => setMenuOpen(false)}
          onEscapeKeyDown={() => setMenuOpen(false)}
        >
          <DropdownMenuItem asChild>
            <UserInfoSection />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href="/settings">Profile</Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/settings/affiliate">Affiliate</Link>
          </DropdownMenuItem>

          {user?.is_admin && (
            <DropdownMenuItem asChild>
              <Link href="/admin">Admin</Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem asChild>
            <button
              type="button"
              className="w-full text-left"
              onClick={handleWatchlistClick}
            >
              Watchlist
              {' '}
              {filters.bookmarked && '✓'}
            </button>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href="/docs/users" data-testid="header-docs-link">Documentation</Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/terms-of-use" data-testid="header-terms-link">Terms of Use</Link>
          </DropdownMenuItem>

          {isMobile && (
            <>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <div className="flex justify-center" onClickCapture={handleMenuClose}>
                  <HeaderPortfolio />
                </div>
              </DropdownMenuItem>
            </>
          )}

          <LocaleSwitcherMenuItem />

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <ThemeSelector />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <button type="button" className="w-full" onClick={() => disconnect()}>
              Logout
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
