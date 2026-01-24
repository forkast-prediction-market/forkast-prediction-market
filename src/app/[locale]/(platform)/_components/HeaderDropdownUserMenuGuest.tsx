'use client'

import type { Route } from 'next'
import { MenuIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
import { useAppKit } from '@/hooks/useAppKit'
import { Link } from '@/i18n/navigation'

export default function HeaderDropdownUserMenuGuest() {
  const { open } = useAppKit()
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

  return (
    <div
      ref={wrapperRef}
      onPointerEnter={handleWrapperPointerEnter}
      onPointerLeave={handleWrapperPointerLeave}
    >
      <DropdownMenu
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
            size="headerIconCompact"
            data-testid="header-menu-button"
          >
            <MenuIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-48"
          collisionPadding={16}
          portalled={false}
          onInteractOutside={() => setMenuOpen(false)}
          onEscapeKeyDown={() => setMenuOpen(false)}
        >
          <DropdownMenuItem onClick={() => open()}>Sign Up</DropdownMenuItem>
          <DropdownMenuItem onClick={() => open()}>Log In</DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href={'/' as Route}>Rewards</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/docs/users" data-testid="header-docs-link">Documentation</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/terms-of-use" data-testid="header-terms-link">Terms of Use</Link>
          </DropdownMenuItem>

          <LocaleSwitcherMenuItem />

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <ThemeSelector />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
