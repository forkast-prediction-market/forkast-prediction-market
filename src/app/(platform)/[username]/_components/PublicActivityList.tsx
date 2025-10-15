'use client'

import type { ActivityOrder } from '@/types'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { AlertCircleIcon, RefreshCwIcon, SquareArrowOutUpRightIcon } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface Props {
  userAddress: string
}

interface FetchUserActivityParams {
  pageParam: number
  userAddress: string
  minAmountFilter: string
}

async function fetchUserActivity({
  pageParam,
  userAddress,
  minAmountFilter,
}: FetchUserActivityParams): Promise<ActivityOrder[]> {
  const params = new URLSearchParams({
    limit: '50',
    offset: pageParam.toString(),
  })

  if (minAmountFilter && minAmountFilter !== 'All') {
    params.set('minAmount', minAmountFilter)
  }

  const controller = new AbortController()

  const response = await fetch(`/api/users/${encodeURIComponent(userAddress)}/activity?${params}`, {
    signal: controller.signal,
  })

  if (!response.ok) {
    throw new Error('Server error occurred. Please try again later.')
  }

  return await response.json()
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

function ActivityItemComponent({ item }: { item: ActivityOrder }) {
  const outcomeText = item.outcome.text
  const outcomeChipColor = outcomeText === 'Yes'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'

  function formatPrice(price: number | null) {
    if (price === null || price === undefined) {
      return '50.0¢'
    }
    return price < 1 ? `${(price * 100).toFixed(1)}¢` : `$${price.toFixed(2)}`
  }

  function formatAmount(amount: number) {
    if (!amount || amount < 0) {
      return '0'
    }
    return amount.toLocaleString('en-US')
  }

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
        {/* Market Icon with Fallback */}
        <div className="size-10 flex-shrink-0 overflow-hidden rounded-lg bg-muted sm:size-12">
          <Image
            src={item.market.icon_url}
            alt={item.market.title}
            width={48}
            height={48}
            className="size-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="mb-1 line-clamp-2 text-xs font-medium sm:text-sm">
            {item.market.title}
          </h4>

          <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-2">
            <span className={cn(
              'inline-flex w-fit rounded-md px-2 py-1 text-xs font-medium',
              outcomeChipColor,
            )}
            >
              {outcomeText}
              {' '}
              {formatPrice(item.price)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatAmount(item.amount)}
              {' '}
              shares
            </span>
          </div>
        </div>
      </div>

      {/* Amount & Time */}
      <div className="flex-shrink-0 space-y-1 text-right">
        <div className="text-xs font-semibold sm:text-sm">
          $
          {(item.total_value || 0).toFixed(2)}
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
        {/* Show timestamp on mobile below the amount */}
        <div className="text-xs text-muted-foreground sm:hidden">
          {formatRelativeTime(new Date(item.created_at))}
        </div>
      </div>
    </div>
  )
}

export default function PublicActivityList({ userAddress }: Props) {
  const queryClient = useQueryClient()
  const parentRef = useRef<HTMLDivElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [minAmountFilter, setMinAmountFilter] = useState('All')
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const handleFilterChange = useCallback((newFilter: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setInfiniteScrollError(null)
    setHasInitialized(false)
    setIsLoadingMore(false)
    setRetryCount(0)

    setMinAmountFilter(newFilter)

    queryClient.invalidateQueries({
      queryKey: ['user-activity', userAddress],
    })
  }, [queryClient, userAddress])

  useEffect(() => {
    queueMicrotask(() => {
      setHasInitialized(false)
      setInfiniteScrollError(null)
      setIsLoadingMore(false)
      setMinAmountFilter('All')
      setRetryCount(0)
    })
  }, [userAddress])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['user-activity', userAddress, minAmountFilter],
    queryFn: ({ pageParam = 0 }) =>
      fetchUserActivity({
        pageParam,
        userAddress,
        minAmountFilter,
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

  const virtualizer = useWindowVirtualizer({
    count: activities.length,
    estimateSize: () => {
      if (typeof window !== 'undefined') {
        return window.innerWidth < 768 ? 120 : 70
      }
      return 70
    },
    scrollMargin: parentRef.current?.offsetTop ?? 0,
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

      if (shouldLoadMore) {
        setIsLoadingMore(true)
        setInfiniteScrollError(null)

        abortControllerRef.current = new AbortController()

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

    abortControllerRef.current = new AbortController()

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
  }, [fetchNextPage])

  const retryInitialLoad = useCallback(() => {
    setRetryCount(prev => prev + 1)
    refetch()
  }, [refetch])

  if (hasInitialError) {
    return (
      <div className="space-y-6">
        {/* Filter Controls - Show even in error state */}
        <div className="flex items-center justify-between">
          <Select value={minAmountFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Min amount:" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="10">$10</SelectItem>
              <SelectItem value="100">$100</SelectItem>
              <SelectItem value="1000">$1,000</SelectItem>
              <SelectItem value="10000">$10,000</SelectItem>
              <SelectItem value="100000">$100,000</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="p-8">
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Failed to load activity</AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p>
                  {retryCount > 0
                    ? `Unable to load activity data after ${retryCount} attempt${retryCount > 1 ? 's' : ''}. Please check your connection and try again.`
                    : 'There was a problem loading the activity data. This could be due to a network issue or server error.'}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={retryInitialLoad}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={loading}
                  >
                    <RefreshCwIcon className={cn('h-3 w-3', loading && 'animate-spin')} />
                    {loading ? 'Retrying...' : 'Try again'}
                  </Button>
                  {retryCount > 2 && (
                    <Button
                      type="button"
                      onClick={() => window.location.reload()}
                      size="sm"
                      variant="ghost"
                    >
                      Refresh page
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={parentRef} className="space-y-6">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <Select value={minAmountFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Min amount:" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            <SelectItem value="10">$10</SelectItem>
            <SelectItem value="100">$100</SelectItem>
            <SelectItem value="1000">$1,000</SelectItem>
            <SelectItem value="10000">$10,000</SelectItem>
            <SelectItem value="100000">$100,000</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          <div className="space-y-0">
            {/* Enhanced loading skeletons that match the actual item structure */}
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 border-b border-border px-3 py-4 last:border-b-0 sm:gap-4 sm:px-5"
              >
                {/* Type skeleton */}
                <div className="w-12 flex-shrink-0 sm:w-16">
                  <Skeleton className="h-4 w-8" />
                </div>

                {/* Market skeleton */}
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                  {/* Market icon skeleton */}
                  <Skeleton className="size-10 flex-shrink-0 rounded-lg sm:size-12" />

                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Market title skeleton */}
                    <Skeleton className="h-4" style={{ width: `${60 + Math.random() * 40}%` }} />

                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                      {/* Outcome chip skeleton */}
                      <Skeleton className="h-6 w-16 rounded-md" />
                      {/* Shares skeleton */}
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>

                {/* Amount & Time skeleton */}
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
          <div className="p-4 text-center text-sm text-muted-foreground">
            {retryCount > 0 ? 'Retrying...' : 'Loading activity...'}
          </div>
        </div>
      )}

      {!loading && activities.length === 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="px-8 py-16 text-center">
            <div className="mx-auto max-w-md space-y-4">
              {/* Icon for empty state */}
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                <svg
                  className="size-6 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>

              {/* Contextual empty state messages */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">
                  {minAmountFilter && minAmountFilter !== 'All'
                    ? 'No activity matches your filter'
                    : 'No trading activity yet'}
                </h3>

                <p className="text-sm text-muted-foreground">
                  {minAmountFilter && minAmountFilter !== 'All'
                    ? `No orders found with a minimum amount of ${minAmountFilter}. This user may have smaller trades or no activity in this range.`
                    : 'This user hasn\'t made any trades yet. Activity will appear here once they start trading on markets.'}
                </p>

                {/* Filter-specific guidance */}
                {minAmountFilter && minAmountFilter !== 'All' && (
                  <div className="mt-4 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong>Tip:</strong>
                      {' '}
                      Try selecting "All" or a lower minimum amount to see more activity.
                    </p>
                  </div>
                )}

                {/* No filter guidance */}
                {(!minAmountFilter || minAmountFilter === 'All') && (
                  <div className="mt-4 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">
                      Trading activity includes buying and selling shares in prediction markets. Check back later or explore other user profiles.
                    </p>
                  </div>
                )}
              </div>
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
                  <ActivityItemComponent item={activity} />
                </div>
              )
            })}
          </div>

          {(isFetchingNextPage || isLoadingMore) && (
            <div className="border-t">
              <div className="space-y-0">
                {/* Enhanced infinite scroll loading skeletons */}
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className={`
                      flex items-center gap-3 border-b border-border px-3 py-4
                      last:border-b-0
                      sm:gap-4 sm:px-5
                    `}
                  >
                    {/* Type skeleton */}
                    <div className="w-12 flex-shrink-0 sm:w-16">
                      <Skeleton className="h-4 w-8" />
                    </div>

                    {/* Market skeleton */}
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                      {/* Market icon skeleton */}
                      <Skeleton className="size-10 flex-shrink-0 rounded-lg sm:size-12" />

                      <div className="min-w-0 flex-1 space-y-2">
                        {/* Market title skeleton */}
                        <Skeleton className="h-4" style={{ width: `${50 + Math.random() * 50}%` }} />

                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          {/* Outcome chip skeleton */}
                          <Skeleton className="h-6 w-16 rounded-md" />
                          {/* Shares skeleton */}
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </div>

                    {/* Amount & Time skeleton */}
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

          {!hasNextPage && activities.length > 0 && !isFetchingNextPage && !isLoadingMore && (
            <div className="border-t bg-muted/20 p-6 text-center">
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">
                  You've reached the end
                </div>
                <div className="text-xs text-muted-foreground">
                  {minAmountFilter && minAmountFilter !== 'All'
                    ? `Showing all activity with minimum amount of ${minAmountFilter}`
                    : `All ${activities.length} trading activities loaded`}
                </div>
              </div>
            </div>
          )}

          {infiniteScrollError && (
            <div className="border-t bg-muted/30 p-4">
              <Alert variant="destructive">
                <AlertCircleIcon className="h-4 w-4" />
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
                      <RefreshCwIcon className={cn('h-3 w-3', isLoadingMore && 'animate-spin')} />
                      {isLoadingMore ? 'Retrying...' : 'Try again'}
                    </Button>
                    {retryCount > 2 && (
                      <Button
                        type="button"
                        onClick={() => {
                          setInfiniteScrollError(null)
                          setRetryCount(0)
                          // Reset to first page
                          queryClient.invalidateQueries({
                            queryKey: ['user-activity', userAddress, minAmountFilter],
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
