import { useAppKit } from '@reown/appkit/react'
import { MenuIcon } from 'lucide-react'
import Link from 'next/link'
import ThemeSelector from '@/components/layout/ThemeSelector'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function HeaderDropdownUserMenuGuest() {
  const { open } = useAppKit()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
        >
          <MenuIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" collisionPadding={16}>
        <DropdownMenuItem onClick={() => open()}>Sign Up</DropdownMenuItem>
        <DropdownMenuItem onClick={() => open()}>Log In</DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/">Rewards</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/">Documentation</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/terms-of-use">Terms of Use</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <ThemeSelector />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
