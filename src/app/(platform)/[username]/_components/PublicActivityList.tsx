'use client'

import type { PublicActivity } from '@/types'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { AlertCircleIcon, RefreshCwIcon, SquareArrowOutUpRightIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatSharePriceLabel, formatTimeAgo } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import PublicActivityEmpty from './PublicActivityEmpty'
import PublicActivityError from './PublicActivityError'
import { ActivitySkeletonRows } from './PublicActivitySkeleton'

interface FetchUserActivityParams {
  pageParam: number
  userAddress: string
  signal?: AbortSignal
}

interface DataApiActivity {
  proxyWallet?: string
  timestamp?: number
  conditionId?: string
  type?: string
  size?: number
  usdcSize?: number
  transactionHash?: string
  price?: number
  asset?: string
  side?: string
  outcomeIndex?: number
  title?: string
  slug?: string
  icon?: string
  eventSlug?: string
  outcome?: string
}

const DATA_API_URL = process.env.DATA_URL!

function mapDataApiActivity(activity: DataApiActivity): PublicActivity {
  const slug = activity.slug || activity.conditionId || 'unknown-market'
  const eventSlug = activity.eventSlug || slug
  const timestampMs = typeof activity.timestamp === 'number'
    ? activity.timestamp * 1000
    : Date.now()
  const usdcValue = Number.isFinite(activity.usdcSize) ? Number(activity.usdcSize) : 0

  return {
    id: activity.transactionHash || `${slug}-${timestampMs}`,
    title: activity.title || 'Untitled market',
    slug,
    eventSlug,
    icon: activity.icon,
    side: activity.side?.toLowerCase() || 'trade',
    outcomeText: activity.outcome || undefined,
    price: Number.isFinite(activity.price) ? Number(activity.price) : undefined,
    shares: Number.isFinite(activity.size) ? Number(activity.size) : undefined,
    usdcValue,
    timestamp: timestampMs,
    txHash: activity.transactionHash,
  }
}

async function fetchUserActivity({
  pageParam,
  userAddress,
  signal,
}: FetchUserActivityParams): Promise<PublicActivity[]> {
  const params = new URLSearchParams({
    limit: '50',
    offset: pageParam.toString(),
    user: userAddress,
  })

  const response = await fetch(`${DATA_API_URL}/activity?${params.toString()}`, { signal })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const errorMessage = errorBody?.error || 'Server error occurred. Please try again later.'
    throw new Error(errorMessage)
  }

  const result = await response.json()
  if (!Array.isArray(result)) {
    throw new TypeError('Unexpected response from data service.')
  }

  return result.map((item: DataApiActivity) => mapDataApiActivity(item))
}

function ActivityItem({ item }: { item: PublicActivity }) {
  const outcomeText = item.outcomeText || 'Outcome'
  const outcomeChipColor = outcomeText.toLowerCase() === 'yes'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  const totalValueUsd = item.usdcValue

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
            src={`https://gateway.irys.xyz/${item.icon}`}
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
            {formatTimeAgo(new Date(item.timestamp).toISOString())}
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
          {formatTimeAgo(item.timestamp.toString())}
        </div>
      </div>
    </div>
  )
}

interface PublicActivityListProps {
  userAddress: string
}

export default function PublicActivityList({ userAddress }: PublicActivityListProps) {
  const queryClient = useQueryClient()
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [scrollMargin, setScrollMargin] = useState(0)

  useEffect(() => {
    queueMicrotask(() => {
      setHasInitialized(false)
      setInfiniteScrollError(null)
      setIsLoadingMore(false)
      setRetryCount(0)
    })
  }, [userAddress])

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery<PublicActivity[]>({
    queryKey: ['user-activity', userAddress],
    queryFn: ({ pageParam = 0, signal }) =>
      fetchUserActivity({
        pageParam: pageParam as unknown as number,
        userAddress,
        signal,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 50) {
        return allPages.reduce((total, page) => total + page.length, 0)
      }
      return undefined
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })

  const activities = data?.pages.flat() ?? []
  const loading = status === 'pending'
  const hasInitialError = status === 'error'

  useEffect(() => {
    if (parentRef.current) {
      setScrollMargin(parentRef.current.offsetTop)
    }
  }, [])

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
        && !isLoadingMore
        && !infiniteScrollError
        && status !== 'pending'

      if (shouldLoadMore) {
        setIsLoadingMore(true)
        setInfiniteScrollError(null)

        fetchNextPage()
          .then(() => {
            setIsLoadingMore(false)
            setRetryCount(0)
          })
          .catch((error) => {
            setIsLoadingMore(false)
            if (error.name !== 'AbortError') {
              const errorMessage = error.message || 'Failed to load more activity'
              setInfiniteScrollError(errorMessage)
            }
          })
      }
    },
  })

  const retryInfiniteScroll = useCallback(() => {
    setInfiniteScrollError(null)
    setIsLoadingMore(true)
    setRetryCount(prev => prev + 1)

    fetchNextPage()
      .then(() => {
        setIsLoadingMore(false)
        setRetryCount(0)
      })
      .catch((error) => {
        setIsLoadingMore(false)
        if (error.name !== 'AbortError') {
          setInfiniteScrollError('Failed to load more activity')
        }
      })
  }, [fetchNextPage])

  const retryInitialLoad = useCallback(() => {
    setRetryCount(prev => prev + 1)
    setInfiniteScrollError(null)
    setIsLoadingMore(false)
    setHasInitialized(false)
    void refetch()
  }, [refetch])

  if (hasInitialError) {
    return (
      <div className="grid gap-6">
        <PublicActivityError
          retryCount={retryCount}
          isLoading={loading}
          onRetry={retryInitialLoad}
        />
      </div>
    )
  }

  return (
    <div ref={parentRef} className="space-y-6">
      {/* Column Headers */}
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
          <ActivitySkeletonRows />
          <div className="p-4 text-center">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {retryCount > 0 ? 'Retrying...' : 'Loading activity...'}
              </div>

            </div>
          </div>
        </div>
      )}

      {!loading && activities.length === 0 && (
        <PublicActivityEmpty />
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
                  <ActivityItem item={activity} />
                </div>
              )
            })}
          </div>

          {(isFetchingNextPage || isLoadingMore) && (
            <div className="border-t">
              <ActivitySkeletonRows count={3} />
            </div>
          )}

          {!hasNextPage && activities.length > 0 && !isFetchingNextPage && !isLoadingMore && (
            <div className="border-t bg-muted/20 p-6 text-center">
              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground">
                  You've reached the end
                </div>
                <div className="text-xs text-muted-foreground">
                  {`All ${activities.length} trading activit${activities.length === 1 ? 'y' : 'ies'} loaded`}
                </div>
              </div>
            </div>
          )}

          {infiniteScrollError && (
            <div className="border-t bg-muted/30 p-4">
              <Alert variant="destructive">
                <AlertCircleIcon className="size-4" />
                <AlertTitle>Failed to load more activity</AlertTitle>
                <AlertDescription className="mt-2 space-y-3">
                  <p className="text-sm">
                    {retryCount > 0
                      ? `Unable to load more data after ${retryCount} attempt${retryCount > 1 ? 's' : ''}. Please check your connection.`
                      : 'There was a problem loading more activity data.'}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={retryInfiniteScroll}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2"
                      disabled={isLoadingMore}
                    >
                      <RefreshCwIcon className={cn('size-3', isLoadingMore && 'animate-spin')} />
                      {isLoadingMore ? 'Retrying...' : 'Try again'}
                    </Button>
                    {retryCount > 2 && (
                      <Button
                        type="button"
                        onClick={() => {
                          setInfiniteScrollError(null)
                          setRetryCount(0)
                          queryClient.invalidateQueries({
                            queryKey: ['user-activity', userAddress],
                          })
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        Start over
                      </Button>
                    )}
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
