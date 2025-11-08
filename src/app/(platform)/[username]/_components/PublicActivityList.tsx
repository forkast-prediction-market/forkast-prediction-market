'use client'

import type { ActivityOrder } from '@/types'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { AlertCircleIcon, RefreshCwIcon, SearchIcon, SquareArrowOutUpRightIcon, XIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounce } from '@/hooks/useDebounce'
import { cn, fromMicro } from '@/lib/utils'

interface ControlsProps {
  searchQuery: string
  minAmountFilter: string
  handleSearchChange: (query: string) => void
  handleFilterChange: (query: string) => void
}

function FilterControls({ searchQuery, handleSearchChange, minAmountFilter, handleFilterChange }: ControlsProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full pr-9 pl-9 sm:w-64"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSearchChange('')}
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0 hover:bg-muted"
            >
              <XIcon className="h-3 w-3" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
        <Select value={minAmountFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Min amount: None</SelectItem>
            <SelectItem value="10">$10</SelectItem>
            <SelectItem value="100">$100</SelectItem>
            <SelectItem value="1000">$1,000</SelectItem>
            <SelectItem value="10000">$10,000</SelectItem>
            <SelectItem value="100000">$100,000</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

interface FetchUserActivityParams {
  pageParam: number
  userAddress: string
  minAmountFilter: string
  searchQuery?: string
}

async function fetchUserActivity({
  pageParam,
  userAddress,
  minAmountFilter,
  searchQuery,
}: FetchUserActivityParams): Promise<ActivityOrder[]> {
  const params = new URLSearchParams({
    limit: '50',
    offset: pageParam.toString(),
  })

  if (minAmountFilter && minAmountFilter !== 'All') {
    params.set('minAmount', minAmountFilter)
  }

  if (searchQuery && searchQuery.trim()) {
    params.set('search', searchQuery.trim())
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

function ActivityItem({ item }: { item: ActivityOrder }) {
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
            <span className={cn(
              'inline-flex w-fit rounded-md px-2 py-1 text-xs font-medium',
              outcomeChipColor,
            )}
            >
              {outcomeText}
              {' '}
              {formatPrice(item.price == null ? null : Number(item.price))}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {fromMicro(item.amount, 1)}
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
          {fromMicro(String(item.total_value))}
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

interface PublicActivityListProps {
  userAddress: string
}

export default function PublicActivityList({ userAddress }: PublicActivityListProps) {
  const queryClient = useQueryClient()
  const parentRef = useRef<HTMLDivElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [minAmountFilter, setMinAmountFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [scrollMargin, setScrollMargin] = useState(0)

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

  const handleSearchChange = useCallback((query: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setInfiniteScrollError(null)
    setHasInitialized(false)
    setIsLoadingMore(false)
    setRetryCount(0)
    setSearchQuery(query)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      setHasInitialized(false)
      setInfiniteScrollError(null)
      setIsLoadingMore(false)
      setMinAmountFilter('All')
      setSearchQuery('')
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
    queryKey: ['user-activity', userAddress, minAmountFilter, debouncedSearchQuery],
    queryFn: ({ pageParam = 0 }) =>
      fetchUserActivity({
        pageParam,
        userAddress,
        minAmountFilter,
        searchQuery: debouncedSearchQuery,
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

  const isSearchActive = debouncedSearchQuery.trim().length > 0

  useEffect(() => {
    if (parentRef.current) {
      setScrollMargin(parentRef.current.offsetTop)
    }
  }, [])

  useEffect(() => {
    setHasInitialized(false)
    setInfiniteScrollError(null)
    setIsLoadingMore(false)

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [debouncedSearchQuery, minAmountFilter])

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
          const errorMessage = debouncedSearchQuery.trim()
            ? `Failed to load more search results for "${debouncedSearchQuery}"`
            : 'Failed to load more activity'
          setInfiniteScrollError(errorMessage)
        }
      })
  }, [fetchNextPage, debouncedSearchQuery])

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
        <FilterControls
          searchQuery={searchQuery}
          minAmountFilter={minAmountFilter}
          handleSearchChange={handleSearchChange}
          handleFilterChange={handleFilterChange}
        />

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="p-8">
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Failed to load activity</AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p>
                  {retryCount > 0
                    ? `Unable to load ${isSearchActive ? 'search results' : 'activity data'} after ${retryCount} attempt${retryCount > 1 ? 's' : ''}. Please check your connection and try again.`
                    : `There was a problem loading the ${isSearchActive ? 'search results' : 'activity data'}. This could be due to a network issue or server error.`}
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
      <FilterControls
        searchQuery={searchQuery}
        minAmountFilter={minAmountFilter}
        handleSearchChange={handleSearchChange}
        handleFilterChange={handleFilterChange}
      />

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
                    <Skeleton className="h-4" style={{ width: '80%' }} />

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
          <div className="p-4 text-center">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {retryCount > 0
                  ? 'Retrying...'
                  : debouncedSearchQuery.trim()
                    ? `Searching for "${debouncedSearchQuery}"...`
                    : 'Loading activity...'}
              </div>

              {debouncedSearchQuery.trim() && retryCount === 0 && (
                <div className={`
                  inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium
                  text-orange-800
                  dark:bg-orange-900/30 dark:text-orange-300
                `}
                >
                  <SearchIcon className="size-3" />
                  Active search
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && activities.length === 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="px-8 py-16 text-center">
            <div className="mx-auto max-w-md space-y-4">
              <div className={cn(
                'mx-auto flex size-12 items-center justify-center rounded-full',
                debouncedSearchQuery.trim()
                  ? 'bg-orange-100 dark:bg-orange-900/30'
                  : 'bg-muted',
              )}
              >
                {debouncedSearchQuery.trim()
                  ? (
                      <SearchIcon className="size-6 text-orange-600 dark:text-orange-400" />
                    )
                  : (
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
                    )}
              </div>

              <div className="space-y-3">
                {debouncedSearchQuery.trim() && (
                  <div className={`
                    inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium
                    text-orange-800
                    dark:bg-orange-900/30 dark:text-orange-300
                  `}
                  >
                    <SearchIcon className="size-3" />
                    Searching for "
                    {debouncedSearchQuery}
                    "
                  </div>
                )}

                <h3 className="text-base font-semibold text-foreground">
                  {debouncedSearchQuery.trim()
                    ? `No results found`
                    : minAmountFilter && minAmountFilter !== 'All'
                      ? 'No activity matches your filter'
                      : 'No trading activity yet'}
                </h3>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  {debouncedSearchQuery.trim()
                    ? `No trading activity found matching "${debouncedSearchQuery}". The search looks through market titles to find relevant trades.`
                    : minAmountFilter && minAmountFilter !== 'All'
                      ? `No orders found with a minimum amount of ${minAmountFilter}. This user may have smaller trades or no activity in this range.`
                      : 'This user hasn\'t made any trades yet. Activity will appear here once they start trading on markets.'}
                </p>

                {debouncedSearchQuery.trim() && (
                  <div className="mt-6 space-y-3">
                    <div className={`
                      rounded-lg border border-orange-200 bg-orange-50 p-4
                      dark:border-orange-800 dark:bg-orange-900/20
                    `}
                    >
                      <div className="space-y-3">
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                          <strong>Search suggestions:</strong>
                        </p>
                        <ul className="space-y-1 text-xs text-orange-700 dark:text-orange-300">
                          <li>• Try different keywords (e.g., "election", "sports", "crypto")</li>
                          <li>• Use shorter, more general terms</li>
                          <li>• Check spelling and try alternative words</li>
                        </ul>
                        <Button
                          type="button"
                          onClick={() => handleSearchChange('')}
                          size="sm"
                          variant="outline"
                          className={`
                            mt-3 w-full border-orange-300 text-orange-800
                            hover:bg-orange-100
                            dark:border-orange-700 dark:text-orange-200 dark:hover:bg-orange-900/40
                          `}
                        >
                          <XIcon className="mr-2 size-3" />
                          Clear search and show all activity
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {!debouncedSearchQuery.trim() && minAmountFilter && minAmountFilter !== 'All' && (
                  <div className="mt-6 rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Filter active:</strong>
                      {' '}
                      Showing only trades with minimum amount of $
                      {minAmountFilter}
                      .
                    </p>
                    <Button
                      type="button"
                      onClick={() => handleFilterChange('All')}
                      size="sm"
                      variant="outline"
                      className="mt-3 w-full"
                    >
                      Show all amounts
                    </Button>
                  </div>
                )}

                {!debouncedSearchQuery.trim() && (!minAmountFilter || minAmountFilter === 'All') && (
                  <div className="mt-6 rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">
                      Trading activity includes buying and selling shares in prediction markets.
                      When this user makes trades, they'll appear here with details about the markets,
                      amounts, and outcomes.
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
                  <ActivityItem item={activity} />
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
                        <Skeleton className="h-4" style={{ width: '75%' }} />

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
              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground">
                  You've reached the end
                </div>
                <div className="text-xs text-muted-foreground">
                  {debouncedSearchQuery.trim()
                    ? `All ${activities.length} result${activities.length === 1 ? '' : 's'} for "${debouncedSearchQuery}" loaded`
                    : minAmountFilter && minAmountFilter !== 'All'
                      ? `Showing all activity with minimum amount of ${minAmountFilter}`
                      : `All ${activities.length} trading activit${activities.length === 1 ? 'y' : 'ies'} loaded`}
                </div>

                {debouncedSearchQuery.trim() && (
                  <div className={`
                    mt-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium
                    text-orange-800
                    dark:bg-orange-900/30 dark:text-orange-300
                  `}
                  >
                    <SearchIcon className="size-3" />
                    Search: "
                    {debouncedSearchQuery}
                    "
                  </div>
                )}
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
                      ? `Unable to load more ${debouncedSearchQuery.trim() ? 'search results' : 'data'} after ${retryCount} attempt${retryCount > 1 ? 's' : ''}. Please check your connection.`
                      : `There was a problem loading more ${debouncedSearchQuery.trim() ? 'search results' : 'activity data'}.`}
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
                          queryClient.invalidateQueries({
                            queryKey: ['user-activity', userAddress, minAmountFilter, debouncedSearchQuery],
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
