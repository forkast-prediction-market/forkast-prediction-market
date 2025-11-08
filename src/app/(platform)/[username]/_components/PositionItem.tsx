'use client'

import type { UserPosition } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import { fromMicro } from '@/lib/utils'

interface PositionItemProps {
  item: UserPosition
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) {
    return 'Today'
  }
  if (diffInDays === 1) {
    return 'Yesterday'
  }
  if (diffInDays < 30) {
    return `${diffInDays} days ago`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths === 1) {
    return '1 month ago'
  }
  if (diffInMonths < 12) {
    return `${diffInMonths} months ago`
  }

  return date.toLocaleDateString()
}

export default function PositionItem({ item }: PositionItemProps) {
  return (
    <div className={`
      flex items-center gap-3 border-b border-border px-3 py-4 transition-colors
      last:border-b-0
      hover:bg-accent/50
      sm:gap-4 sm:px-5
    `}
    >
      {/* Market */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Link
          href={`/event/${item.market.slug}`}
          className="size-10 flex-shrink-0 overflow-hidden rounded bg-muted sm:size-12"
        >
          <Image
            src={item.market.icon_url}
            alt={item.market.title}
            width={48}
            height={48}
            className="size-full object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <h4 className="mb-1 line-clamp-2 text-xs font-medium sm:text-sm">
            <Link href={`/event/${item.market.slug}`}>{item.market.title}</Link>
          </h4>

          <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-2">
            <span className={`
              inline-flex w-fit rounded-md px-2 py-1 text-xs font-medium
              ${item.market.is_active && !item.market.is_resolved
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
            `}
            >
              {item.market.is_active && !item.market.is_resolved ? 'Active' : 'Closed'}
            </span>
            <span className="text-xs text-muted-foreground">
              {item.order_count}
              {' '}
              order
              {item.order_count !== 1 ? 's' : ''}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {formatRelativeTime(new Date(item.last_activity_at))}
            </span>
          </div>
        </div>
      </div>

      {/* Average Position */}
      <div className="flex-shrink-0 text-right">
        <div className="text-xs font-semibold sm:text-sm">
          $
          {fromMicro(String(item.average_position), 2)}
        </div>
        <div className="text-xs text-muted-foreground">Avg</div>
      </div>

      {/* Total Position Value */}
      <div className="flex-shrink-0 text-right">
        <div className="text-xs font-semibold sm:text-sm">
          $
          {fromMicro(String(item.total_position_value), 2)}
        </div>
        <div className="text-xs text-muted-foreground">Total</div>
        {/* Show timestamp on mobile below the amount */}
        <div className="text-xs text-muted-foreground sm:hidden">
          {formatRelativeTime(new Date(item.last_activity_at))}
        </div>
      </div>
    </div>
  )
}
