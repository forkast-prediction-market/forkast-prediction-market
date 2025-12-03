'use client'

import type { PublicActivity } from '@/types'
import { SquareArrowOutUpRightIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { formatCurrency, formatSharePriceLabel, formatTimeAgo } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export default function PublicActivityItem({ item }: { item: PublicActivity }) {
  const outcomeText = item.outcomeText || 'Outcome'
  const outcomeChipColor = outcomeText.toLowerCase() === 'yes'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  const totalValueUsd = item.usdcValue
  const timestampLabel = formatTimeAgo(new Date(item.timestamp).toISOString())

  return (
    <div className={`
      flex items-center gap-3 border-b border-border px-3 py-4 transition-colors
      last:border-b-0
      hover:bg-accent/50
      sm:gap-4 sm:px-5
    `}
    >
      {/* Type */}
      <div className="w-12 flex-shrink-0 sm:w-16">
        <span className="text-xs font-medium capitalize sm:text-sm">{item.side}</span>
      </div>

      {/* Market */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Link
          href={`/event/${item.eventSlug}`}
          className="size-10 flex-shrink-0 overflow-hidden rounded bg-muted sm:size-12"
        >
          <Image
            src={item.icon || '/favicon.ico'}
            alt={item.title}
            width={48}
            height={48}
            className="size-full object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <h4 className="mb-1 line-clamp-2 text-xs font-medium sm:text-sm">
            <Link href={`/event/${item.eventSlug}`}>{item.title}</Link>
          </h4>

          <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-2">
            <span className={cn(
              'inline-flex w-fit rounded-md px-2 py-1 text-xs font-medium',
              outcomeChipColor,
            )}
            >
              {outcomeText}
              {' '}
              {formatSharePriceLabel(item.price == null ? null : Number(item.price))}
            </span>
            {typeof item.shares === 'number' && (
              <span className="text-xs font-semibold text-muted-foreground">
                {item.shares.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                {' '}
                shares
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Amount & Time */}
      <div className="flex-shrink-0 space-y-1 text-right">
        <div className="text-xs font-semibold sm:text-sm">
          {formatCurrency(totalValueUsd)}
        </div>
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {timestampLabel}
          </span>
          <a
            href={`https://polygonscan.com/tx/${item.txHash ?? item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            title="View on Polygonscan"
            aria-label={`View transaction ${item.txHash ?? item.id} on Polygonscan`}
          >
            <SquareArrowOutUpRightIcon className="size-3" />
          </a>
        </div>
        {/* Show timestamp on mobile below the amount */}
        <div className="text-xs text-muted-foreground sm:hidden">
          {timestampLabel}
        </div>
      </div>
    </div>
  )
}
