import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatTimeAgo, truncateAddress } from '@/lib/utils'

interface ProfileLinkProps {
  user: {
    address: string
    username?: string | null
    image?: string | null
  }
  position?: number
  date?: string
  children?: ReactNode
}

export default function ProfileLink({ user, position, date, children }: ProfileLinkProps) {
  const medalColor = useMemo(() => {
    return {
      1: '#FFD700',
      2: '#C0C0C0',
      3: '#CD7F32',
    }[position ?? 0] ?? '#000000'
  }, [position])

  const medalTextColor = useMemo(() => {
    return medalColor === '#000000' ? '#ffffff' : '#1a1a1a'
  }, [medalColor])

  return (
    <Link
      href={user.username ? `/@${user.username}` : `/@${user.address}`}
      className="flex items-start gap-3 border-b border-border/30 py-2 last:border-b-0"
    >
      <div className="relative shrink-0">
        <Image
          src={user.image || `https://avatar.vercel.sh/${user.address}.png`}
          alt={user.username || user.address}
          width={32}
          height={32}
          className="rounded-full"
        />
        {position && (
          <Badge
            variant="secondary"
            style={{ backgroundColor: medalColor, color: medalTextColor }}
            className="absolute top-0 -right-2 size-5 rounded-full px-1 font-mono text-muted-foreground tabular-nums"
          >
            {position}
          </Badge>
        )}
      </div>
      <div className="grid gap-1">
        <div className="flex max-w-32 items-center gap-1 lg:max-w-64">
          <span className="truncate text-sm font-medium">
            {user.username || truncateAddress(user.address)}
          </span>
          {date && (
            <span className="text-xs whitespace-nowrap text-muted-foreground">
              {formatTimeAgo(date)}
            </span>
          )}
        </div>
        {children}
      </div>
    </Link>
  )
}
