import { MenuIcon } from 'lucide-react'
import Link from 'next/link'
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

export default function HeaderDropdownUserMenuGuest() {
  const { open } = useAppKit()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-testid="header-menu-button"
        >
          <MenuIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" collisionPadding={16}>
        <DropdownMenuItem onClick={() => open()}>Sign Up</DropdownMenuItem>
        <DropdownMenuItem onClick={() => open()}>Log In</DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/public">Rewards</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/docs" data-testid="header-docs-link">Documentation</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/terms-of-use" data-testid="header-terms-link">Terms of Use</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <ThemeSelector />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
