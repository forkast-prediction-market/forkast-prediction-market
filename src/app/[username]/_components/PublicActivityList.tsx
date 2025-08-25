'use client'

import type { ActivityItem } from '@/types'
import { ChevronDownIcon, SquareArrowOutUpRightIcon } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  activity: ActivityItem[]
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

function formatShares(shares: number): string {
  if (shares < 0.1) {
    return '<0.1 shares'
  }
  if (shares === 1) {
    return '1 share'
  }
  return `${shares} shares`
}

function ActivityItemComponent({ item }: { item: ActivityItem }) {
  const outcomeChipColor = item.market.outcome === 'Yes'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'

  return (
    <div className={`
      flex items-center gap-4 border-b border-border px-5 py-4 transition-colors
      last:border-b-0
      hover:bg-accent/50
    `}
    >
      {/* Type */}
      <div className="w-16 flex-shrink-0">
        <span className="text-sm font-medium">{item.type}</span>
      </div>

      {/* Market */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Image
          src={item.market.imageUrl}
          alt={item.market.title}
          width={48}
          height={48}
          className="size-12 flex-shrink-0 rounded-lg object-cover"
        />

        <div className="min-w-0 flex-1">
          <h4 className="mb-1 line-clamp-2 text-sm font-medium">
            {item.market.title}
          </h4>

          <div className="flex items-center gap-2 text-xs">
            <span className={cn(
              'rounded-md px-2 py-1 font-medium',
              outcomeChipColor,
            )}
            >
              {item.market.outcome}
              {' '}
              {item.market.price}
              ¢
            </span>
            <span className="text-muted-foreground">
              {formatShares(item.shares)}
            </span>
          </div>
        </div>
      </div>

      {/* Amount & Time */}
      <div className="flex-shrink-0 space-y-1 text-right">
        <div className="text-sm font-semibold">
          $
          {item.amount.toFixed(2)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(item.timestamp)}
          </span>
          <a
            href={`https://polygonscan.com/tx/${item.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            title="View on Polygonscan"
          >
            <SquareArrowOutUpRightIcon className="size-3" />
          </a>
        </div>
      </div>
    </div>
  )
}

export default function PublicActivityList({ activity }: Props) {
  const [minAmountFilter] = useState<string>('All')

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <Button variant="outline" className="gap-2">
          Min amount:
          {' '}
          {minAmountFilter}
          <ChevronDownIcon className="size-4" />
        </Button>
      </div>

      {/* Column Headers */}
      <div className={`
        mb-2 flex items-center gap-4 px-5 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase
      `}
      >
        <div className="w-16">Type</div>
        <div className="flex-1">Market</div>
        <div className="text-right">Amount</div>
      </div>

      {/* Activity List */}
      <div className="overflow-hidden rounded-lg border border-border">
        {activity.length === 0
          ? (
              <div className="py-16 text-center text-muted-foreground">
                No activity found
              </div>
            )
          : (
              <div>
                {activity.map(item => (
                  <ActivityItemComponent key={item.id} item={item} />
                ))}
              </div>
            )}
      </div>

      {/* End of Results */}
      {activity.length > 0 && (
        <div className="py-4 text-center">
          <span className="text-sm text-muted-foreground">End of results</span>
        </div>
      )}
    </div>
  )
}
