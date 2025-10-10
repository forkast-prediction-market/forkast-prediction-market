import type { ActivityOrder, Event } from '@/types'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTimeAgo, truncateAddress } from '@/lib/utils'

interface EventActivityProps {
  event: Event
}

function ActivitySkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border/30 py-2">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  )
}

export default function EventActivity({ event }: EventActivityProps) {
  const [activities, setActivities] = useState<ActivityOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [minAmountFilter, setMinAmountFilter] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch initial activity data
  useEffect(() => {
    let isMounted = true

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    async function fetchActivities() {
      try {
        setLoading(true)
        setError(null)
        setLoadMoreError(null)

        const params = new URLSearchParams({
          limit: '50',
          offset: '0',
        })

        if (minAmountFilter && minAmountFilter !== 'none') {
          params.set('minAmount', minAmountFilter)
        }

        const response = await fetch(`/api/events/${event.slug}/activity?${params}`, {
          signal: abortControllerRef.current?.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to fetch activity data')
        }

        const data = await response.json()

        if (isMounted) {
          setActivities(data)
          setHasMore(data.length === 50) // If we got 50 items, there might be more
        }
      }
      catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return // Request was cancelled, don't update state
        }

        if (isMounted) {
          console.error('Error fetching activity:', error)

          // Provide more specific error messages
          if (error instanceof Error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
              setError('Network error. Please check your connection and try again.')
            }
            else if (error.message.includes('404')) {
              setError('Event not found.')
            }
            else if (error.message.includes('500')) {
              setError('Server error. Please try again later.')
            }
            else {
              setError(error.message)
            }
          }
          else {
            setError('Failed to load activity')
          }
        }
      }
      finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchActivities()

    return () => {
      isMounted = false
      abortControllerRef.current?.abort()
    }
  }, [event.slug, minAmountFilter])

  async function loadMoreActivities() {
    if (loadingMore || !hasMore) {
      return
    }

    try {
      setLoadingMore(true)
      setLoadMoreError(null)

      const params = new URLSearchParams({
        limit: '50',
        offset: activities.length.toString(),
      })

      if (minAmountFilter && minAmountFilter !== 'none') {
        params.set('minAmount', minAmountFilter)
      }

      const response = await fetch(`/api/events/${event.slug}/activity?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch more activity data')
      }

      const newData = await response.json()

      setActivities(prev => [...prev, ...newData])
      setHasMore(newData.length === 50) // If we got 50 items, there might be more
    }
    catch (error) {
      console.error('Error loading more activity:', error)
      // For load more errors, we don't want to clear the existing data
      // Just show a temporary error message or retry option
      if (error instanceof Error && error.name === 'TypeError' && error.message.includes('fetch')) {
        // Network error
        setLoadMoreError('Network error. Please check your connection.')
      }
      else {
        setLoadMoreError(error instanceof Error ? error.message : 'Failed to load more activity')
      }
    }
    finally {
      setLoadingMore(false)
    }
  }

  function formatPrice(price: number | null) {
    if (price === null) {
      return '50.0¢'
    }
    return price < 1 ? `${(price * 100).toFixed(1)}¢` : `$${price.toFixed(2)}`
  }

  function formatAmount(amount: number) {
    return amount.toLocaleString()
  }

  function formatTotalValue(totalValue: number) {
    return totalValue < 1 ? `${(totalValue * 100).toFixed(0)}¢` : `$${totalValue.toFixed(2)}`
  }

  function retryFetch() {
    setError(null)
    // Trigger useEffect by updating a dependency
    const currentFilter = minAmountFilter
    setMinAmountFilter('')
    setTimeout(() => setMinAmountFilter(currentFilter), 0)
  }

  if (error) {
    return (
      <div className="mt-6">
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-2">
              <p>
                Failed to load activity data:
                {error}
              </p>
              <button
                type="button"
                onClick={retryFetch}
                className="text-sm underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="mt-6">
      {/* Min Amount Filter */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Select value={minAmountFilter} onValueChange={setMinAmountFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Min Amount:" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="10">$10</SelectItem>
              <SelectItem value="100">$100</SelectItem>
              <SelectItem value="1000">$1,000</SelectItem>
              <SelectItem value="10000">$10,000</SelectItem>
              <SelectItem value="100000">$100,000</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {loading
        ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <ActivitySkeleton key={index} />
              ))}
            </div>
          )
        : activities.length === 0
          ? (
              <div className="py-8 text-center">
                <div className="text-sm text-muted-foreground">
                  {minAmountFilter && minAmountFilter !== 'none'
                    ? `No activity found with minimum amount of $${Number.parseInt(minAmountFilter).toLocaleString()}.`
                    : 'No trading activity yet for this event.'}
                </div>
                {minAmountFilter && minAmountFilter !== 'none' && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Try lowering the minimum amount filter to see more activity.
                  </div>
                )}
              </div>
            )
          : (
              <>
                {/* List of Activities */}
                <div className="space-y-4">
                  {activities.map(activity => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 border-b border-border/30 py-2 last:border-b-0"
                    >
                      <Image
                        src={activity.user.image || `https://avatar.vercel.sh/${activity.user.address}.png`}
                        alt={activity.user.username || activity.user.address}
                        width={32}
                        height={32}
                        className="shrink-0 rounded-full"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">
                          {activity.user.username || truncateAddress(activity.user.address)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {' '}
                          {activity.side === 'buy' ? 'bought' : 'sold'}
                          {' '}
                        </span>
                        <span className="text-sm font-semibold">
                          {formatAmount(activity.amount)}
                        </span>
                        <span
                          className={`ml-1 text-sm font-semibold ${
                            activity.outcome.index === 0
                              ? 'text-yes'
                              : 'text-no'
                          }`}
                        >
                          {activity.outcome.text}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {' '}
                          for
                          {' '}
                          {activity.market.title}
                          {' '}
                          at
                          {' '}
                        </span>
                        <span className="text-sm font-semibold">
                          {formatPrice(activity.price)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {' '}
                          (
                          {formatTotalValue(activity.total_value)}
                          )
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.created_at)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="mt-4 text-center">
                    {loadMoreError
                      ? (
                          <div className="space-y-2">
                            <div className="text-sm text-destructive">
                              {loadMoreError}
                            </div>
                            <button
                              type="button"
                              onClick={loadMoreActivities}
                              className={`
                                rounded-full border px-4 py-2 text-sm font-medium transition-colors
                                hover:bg-muted/50
                              `}
                            >
                              Try Again
                            </button>
                          </div>
                        )
                      : (
                          <button
                            type="button"
                            onClick={loadMoreActivities}
                            disabled={loadingMore}
                            className={`
                              rounded-full border px-4 py-2 text-sm font-medium transition-colors
                              hover:bg-muted/50
                              disabled:opacity-50
                            `}
                          >
                            {loadingMore ? 'Loading...' : 'Load More'}
                          </button>
                        )}
                  </div>
                )}
              </>
            )}
    </div>
  )
}
