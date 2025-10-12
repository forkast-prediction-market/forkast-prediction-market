'use client'

import type { ActivityOrder, Event } from '@/types'
import { AlertCircleIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ProfileLink from '@/components/ProfileLink'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface EventActivityProps {
  event: Event
}

export default function EventActivity({ event }: EventActivityProps) {
  const [activities, setActivities] = useState<ActivityOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [minAmountFilter, setMinAmountFilter] = useState('none')
  const abortControllerRef = useRef<AbortController | null>(null)
  const loadMoreAbortControllerRef = useRef<AbortController | null>(null)

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
          setError('Internal server error')
          return
        }

        const data = await response.json()

        if (isMounted) {
          setActivities(data)
          setHasMore(data.length === 50)
        }
      }
      catch {
        if (isMounted) {
          setError('Internal server error')
        }
      }
      finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    queueMicrotask(() => fetchActivities())

    return () => {
      isMounted = false
      abortControllerRef.current?.abort()
      loadMoreAbortControllerRef.current?.abort()
    }
  }, [event.slug, minAmountFilter])

  async function loadMoreActivities() {
    if (loadingMore || !hasMore) {
      return
    }

    if (loadMoreAbortControllerRef.current) {
      loadMoreAbortControllerRef.current.abort()
    }

    loadMoreAbortControllerRef.current = new AbortController()

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

      const response = await fetch(`/api/events/${event.slug}/activity?${params}`, {
        signal: loadMoreAbortControllerRef.current?.signal,
      })

      if (!response.ok) {
        setLoadMoreError('Failed to fetch more activity data')
        return
      }

      const newData = await response.json()

      setActivities(prev => [...prev, ...newData])
      setHasMore(newData.length === 50)
    }
    catch {
      setLoadMoreError('Internal server error')
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
    return amount.toLocaleString('en-US')
  }

  function formatTotalValue(totalValue: number) {
    return totalValue < 1 ? `${(totalValue * 100).toFixed(0)}¢` : `$${totalValue.toFixed(2)}`
  }

  function retryFetch() {
    setError(null)
    const currentFilter = minAmountFilter
    setMinAmountFilter('')
    setTimeout(() => setMinAmountFilter(currentFilter), 0)
  }

  if (error) {
    return (
      <div className="mt-6">
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>{error}</AlertTitle>
          <AlertDescription>
            <Button
              type="button"
              onClick={retryFetch}
              size="sm"
              variant="link"
              className="-ml-3"
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="mt-6 grid gap-6">
      <div className="flex items-center gap-2">
        <Select value={minAmountFilter} onValueChange={setMinAmountFilter}>
          <SelectTrigger className="w-32">
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

      {loading
        ? (
            <p className="text-center text-sm text-muted-foreground">
              Loading activity...
            </p>
          )
        : activities.length === 0
          ? (
              <div className="text-center">
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
                <div className="grid gap-4">
                  {activities.map(activity => (
                    <ProfileLink
                      key={activity.id}
                      user={activity.user}
                      date={activity.created_at}
                    >
                      <div className="flex-1">
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
                    </ProfileLink>
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-4 text-center">
                    {loadMoreError
                      ? (
                          <div className="space-y-2">
                            <div className="text-sm text-destructive">
                              {loadMoreError}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={loadMoreActivities}
                            >
                              Try Again
                            </Button>
                          </div>
                        )
                      : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={loadMoreActivities}
                            disabled={loadingMore}
                          >
                            {loadingMore ? 'Loading...' : 'Load More'}
                          </Button>
                        )}
                  </div>
                )}
              </>
            )}
    </div>
  )
}
