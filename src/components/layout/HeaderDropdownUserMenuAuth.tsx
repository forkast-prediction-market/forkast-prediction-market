import { useDisconnect } from '@reown/appkit-controllers/react'
import { ChevronDownIcon } from 'lucide-react'
import Image from 'next/image'
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
import { useUser } from '@/stores/useUser'

export default function HeaderDropdownUserMenuAuth() {
  const { disconnect } = useDisconnect()
  const user = useUser()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
        >
          <Image
            src={user?.image || `https://avatar.vercel.sh/${user?.address}.png`}
            alt="User avatar"
            width={24}
            height={24}
            className="rounded-full"
          />
          <ChevronDownIcon className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" collisionPadding={16}>
        <DropdownMenuItem asChild>
          <Link href="/settings">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/">Watchlist</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/">Documentation</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/">Terms of Use</Link>
        </DropdownMenuItem>

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
  )
}
