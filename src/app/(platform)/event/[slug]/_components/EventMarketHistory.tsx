'use client'

import type { ActivityOrder, Event } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { AlertCircleIcon, RefreshCwIcon, SquareArrowOutUpRightIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatSharePriceLabel, fromMicro } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useUser } from '@/stores/useUser'

interface EventMarketHistoryProps {
  market: Event['markets'][number]
  eventSlug: string
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

async function fetchUserMarketActivity(params: {
  pageParam: number
  userAddress: string
  conditionId: string
}): Promise<ActivityOrder[]> {
  const { pageParam, userAddress, conditionId } = params
  const searchParams = new URLSearchParams({
    limit: '50',
    offset: pageParam.toString(),
  })

  if (conditionId) {
    searchParams.set('conditionId', conditionId)
  }

  const response = await fetch(`/api/users/${encodeURIComponent(userAddress)}/activity?${searchParams}`)

  if (!response.ok) {
    throw new Error('Failed to fetch history')
  }

  return await response.json()
}

function ActivityItem({ item, eventSlug }: { item: ActivityOrder, eventSlug: string }) {
  const outcomeText = item.outcome.text
  const outcomeChipColor = outcomeText === 'Yes'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  const totalValueUsd = Number(fromMicro(String(item.total_value), 2)) || 0

  const eventHref = item.market.event?.slug
    ? `/event/${item.market.event.slug}`
    : `/event/${eventSlug}`

  return (
    <div className={`
      flex items-center gap-3 border-b border-border px-3 py-4 transition-colors
      last:border-b-0
      hover:bg-accent/50
      sm:gap-4 sm:px-5
    `}
    >
      <div className="w-12 flex-shrink-0 sm:w-16">
        <span className="text-xs font-medium capitalize sm:text-sm">{item.side}</span>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Link
          href={eventHref}
          className="size-10 flex-shrink-0 overflow-hidden rounded bg-muted sm:size-12"
        >
          {item.market.icon_url
            ? (
                <Image
                  src={item.market.icon_url}
                  alt={item.market.title}
                  width={48}
                  height={48}
                  className="size-full object-cover"
                />
              )
            : (
                <div className="size-full bg-muted" />
              )}
        </Link>

        <div className="min-w-0 flex-1">
          <h4 className="mb-1 line-clamp-2 text-xs font-medium sm:text-sm">
            <Link href={eventHref}>{item.market.title}</Link>
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
            <span className="text-xs font-semibold text-muted-foreground">
              {fromMicro(item.amount)}
              {' '}
              shares
            </span>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 space-y-1 text-right">
        <div className="text-xs font-semibold sm:text-sm">
          {formatCurrency(totalValueUsd)}
        </div>
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {formatRelativeTime(new Date(item.created_at))}
          </span>
          <a
            href={`https://polygonscan.com/tx/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            title="View on Polygonscan"
            aria-label={`View transaction ${item.id} on Polygonscan`}
          >
            <SquareArrowOutUpRightIcon className="size-3" />
          </a>
        </div>
        <div className="text-xs text-muted-foreground sm:hidden">
          {formatRelativeTime(new Date(item.created_at))}
        </div>
      </div>
    </div>
  )
}

export default function EventMarketHistory({ market, eventSlug }: EventMarketHistoryProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const user = useUser()

  const conditionId = market.condition_id

  useEffect(() => {
    if (parentRef.current) {
      setScrollMargin(parentRef.current.offsetTop)
    }
    setHasInitialized(false)
    setInfiniteScrollError(null)
  }, [conditionId])

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['user-market-activity', user?.address, conditionId],
    queryFn: ({ pageParam = 0 }) => fetchUserMarketActivity({
      pageParam,
      userAddress: user?.address ?? '',
      conditionId,
    }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 50) {
        return allPages.reduce((total, page) => total + page.length, 0)
      }
      return undefined
    },
    enabled: Boolean(user?.address && conditionId),
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })

  const activities = useMemo(() => data?.pages.flat() ?? [], [data])
  const loading = status === 'pending'
  const hasInitialError = status === 'error'

  const virtualizer = useWindowVirtualizer({
    count: activities.length,
    estimateSize: () => {
      if (typeof window !== 'undefined') {
        return window.innerWidth < 768 ? 110 : 70
      }
      return 70
    },
    scrollMargin,
    overscan: 5,
    onChange: (instance) => {
      if (!hasInitialized && activities.length > 0) {
        setHasInitialized(true)
        return
      }

      if (!hasInitialized || activities.length === 0) {
        return
      }

      const items = instance.getVirtualItems()
      const lastItem = items[items.length - 1]

      const shouldLoadMore = lastItem
        && lastItem.index >= activities.length - 5
        && hasNextPage
        && !isFetchingNextPage
        && !infiniteScrollError
        && status !== 'pending'

      if (shouldLoadMore) {
        setInfiniteScrollError(null)

        fetchNextPage()
          .catch((error) => {
            if (error?.name === 'AbortError') {
              return
            }
            const errorMessage = error?.message || 'Failed to load more history'
            setInfiniteScrollError(errorMessage)
          })
      }
    },
  })

  if (!user?.address) {
    return (
      <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
        Sign in to view your trading history for this market.
      </div>
    )
  }

  if (hasInitialError) {
    return (
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="p-8">
          <Alert variant="destructive">
            <AlertCircleIcon className="size-4" />
            <AlertTitle>Failed to load history</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p className="text-sm">
                There was a problem loading your trades for this market.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => refetch()}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  <RefreshCwIcon className={cn('size-3', loading && 'animate-spin')} />
                  {loading ? 'Retrying...' : 'Try again'}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div ref={parentRef} className="space-y-4">
      <div className={`
        mb-2 flex items-center gap-3 px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase
        sm:gap-4 sm:px-5
      `}
      >
        <div className="w-12 sm:w-16">Type</div>
        <div className="flex-1">Market</div>
        <div className="text-right">Amount</div>
      </div>

      {loading && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 border-b border-border px-3 py-4 last:border-b-0 sm:gap-4 sm:px-5"
              >
                <div className="w-12 flex-shrink-0 sm:w-16">
                  <Skeleton className="h-4 w-8" />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                  <Skeleton className="size-10 flex-shrink-0 rounded-lg sm:size-12" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4" style={{ width: '80%' }} />
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <Skeleton className="h-6 w-16 rounded-md" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 space-y-1 text-right">
                  <Skeleton className="h-4 w-16" />
                  <div className="flex items-center justify-end gap-1 sm:gap-2">
                    <Skeleton className="hidden h-3 w-12 sm:block" />
                    <Skeleton className="size-3" />
                  </div>
                  <Skeleton className="h-3 w-12 sm:hidden" />
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 text-center">
            <div className="text-sm text-muted-foreground">
              Loading history...
            </div>
          </div>
        </div>
      )}

      {!loading && activities.length === 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="px-8 py-12 text-center">
            <div className="mx-auto max-w-md space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                <AlertCircleIcon className="size-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                No trading history yet
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                You haven&apos;t traded in this market yet. Your buys and sells will appear here once you do.
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && activities.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
              width: '100%',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const activity = activities[virtualItem.index]
              if (!activity) {
                return null
              }

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${
                      virtualItem.start
                      - (virtualizer.options.scrollMargin ?? 0)
                    }px)`,
                  }}
                >
                  <ActivityItem item={activity} eventSlug={eventSlug} />
                </div>
              )
            })}
          </div>

          {(isFetchingNextPage) && (
            <div className="border-t">
              <div className="space-y-0">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className={`
                      flex items-center gap-3 border-b border-border px-3 py-4
                      last:border-b-0
                      sm:gap-4 sm:px-5
                    `}
                  >
                    <div className="w-12 flex-shrink-0 sm:w-16">
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                      <Skeleton className="size-10 flex-shrink-0 rounded-lg sm:size-12" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4" style={{ width: '75%' }} />
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <Skeleton className="h-6 w-16 rounded-md" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 space-y-1 text-right">
                      <Skeleton className="h-4 w-16" />
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <Skeleton className="hidden h-3 w-12 sm:block" />
                        <Skeleton className="size-3" />
                      </div>
                      <Skeleton className="h-3 w-12 sm:hidden" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasNextPage && activities.length > 0 && !isFetchingNextPage && (
            <div className="border-t bg-muted/20 p-6 text-center">
              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground">
                  You&apos;ve reached the end
                </div>
                <div className="text-xs text-muted-foreground">
                  All
                  {' '}
                  {activities.length}
                  {' '}
                  trade
                  {activities.length === 1 ? '' : 's'}
                  {' '}
                  for this market are loaded.
                </div>
              </div>
            </div>
          )}

          {infiniteScrollError && (
            <div className="border-t bg-muted/30 p-4">
              <Alert variant="destructive">
                <AlertCircleIcon className="size-4" />
                <AlertTitle>Failed to load more history</AlertTitle>
                <AlertDescription className="mt-2 space-y-3">
                  <p className="text-sm">
                    {infiniteScrollError}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setInfiniteScrollError(null)
                        void fetchNextPage()
                      }}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2"
                      disabled={isFetchingNextPage}
                    >
                      <RefreshCwIcon className={cn('size-3', isFetchingNextPage && 'animate-spin')} />
                      {isFetchingNextPage ? 'Retrying...' : 'Try again'}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
