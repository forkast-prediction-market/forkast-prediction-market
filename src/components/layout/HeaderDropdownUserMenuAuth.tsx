import { useDisconnect } from '@reown/appkit-controllers/react'
import { ChevronDownIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import ThemeSelector from '@/components/layout/ThemeSelector'
import UserInfoSection from '@/components/layout/UserInfoSection'
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
          className="flex h-auto items-center gap-2 px-2 py-1"
        >
          <Image
            src={user?.image || `https://avatar.vercel.sh/${user?.address}.png`}
            alt="User avatar"
            width={32}
            height={32}
            className="rounded-full"
          />
          <ChevronDownIcon className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 sm:w-60 lg:w-64" collisionPadding={16}>
        <DropdownMenuItem asChild>
          <UserInfoSection />
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings?tab=affiliate">Affiliate</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/?bookmarked=true">Watchlist</Link>
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
