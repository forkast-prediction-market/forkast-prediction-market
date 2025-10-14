import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatTimeAgo, truncateAddress } from '@/lib/utils'

interface ProfileLinkProps {
  user: {
    address: string
    image: string
    username?: string | null
  }
  position?: number
  date?: string
  children?: ReactNode
}

export default function ProfileLink({ user, position, date, children }: ProfileLinkProps) {
  const medalColor = {
    1: '#FFD700',
    2: '#C0C0C0',
    3: '#CD7F32',
  }[position ?? 0] ?? '#000000'

  const medalTextColor = medalColor === '#000000' ? '#ffffff' : '#1a1a1a'
  const href = `/@${user.username || user.address}` as any

  return (
    <div className="flex items-start gap-3 py-2">
      <Link href={href} className="relative shrink-0">
        <Image
          src={user.image}
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
      </Link>
      <div className="w-full">
        <div className="flex max-w-32 items-center gap-1 lg:max-w-64">
          <Link href={href} className="truncate text-sm font-medium">
            {user.username || truncateAddress(user.address)}
          </Link>
          {date && (
            <span className="text-xs whitespace-nowrap text-muted-foreground">
              {formatTimeAgo(date)}
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
