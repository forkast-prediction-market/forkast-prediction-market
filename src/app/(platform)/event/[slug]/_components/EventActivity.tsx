'use client'

import type { ActivityOrder, Event } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { AlertCircleIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ProfileLink from '@/components/ProfileLink'
import ProfileLinkSkeleton from '@/components/ProfileLinkSkeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OUTCOME_INDEX } from '@/lib/constants'

interface EventActivityProps {
  event: Event
}

interface FetchActivitiesParams {
  pageParam: number
  eventSlug: string
  minAmountFilter: string
}

async function fetchActivities({
  pageParam,
  eventSlug,
  minAmountFilter,
}: FetchActivitiesParams): Promise<ActivityOrder[]> {
  const params = new URLSearchParams({
    limit: '50',
    offset: pageParam.toString(),
  })

  if (minAmountFilter && minAmountFilter !== 'none') {
    params.set('minAmount', minAmountFilter)
  }

  const response = await fetch(`/api/events/${eventSlug}/activity?${params}`)

  if (!response.ok) {
    throw new Error('Failed to fetch activity data')
  }

  return await response.json()
}

export default function EventActivity({ event }: EventActivityProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [minAmountFilter, setMinAmountFilter] = useState('none')
  const [scrollMargin, setScrollMargin] = useState(0)
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)

  useEffect(() => {
    queueMicrotask(() => setInfiniteScrollError(null))
  }, [minAmountFilter])

  useEffect(() => {
    queueMicrotask(() => {
      if (parentRef.current) {
        setScrollMargin(parentRef.current.offsetTop)
      }
    })
  }, [])

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['event-activity', event.slug, minAmountFilter],
    queryFn: ({ pageParam = 0 }) =>
      fetchActivities({
        pageParam,
        eventSlug: event.slug,
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
    scrollMargin,
    overscan: 5,
    onChange: (instance) => {
      if (!hasInitialized) {
        setHasInitialized(true)
        return
      }

      const items = instance.getVirtualItems()
      const last = items[items.length - 1]
      if (
        last
        && last.index >= activities.length - 1
        && hasNextPage
        && !isFetchingNextPage
        && !infiniteScrollError
      ) {
        queueMicrotask(() => {
          fetchNextPage().catch((error) => {
            setInfiniteScrollError(error.message || 'Failed to load more activity')
          })
        })
      }
    },
  })

  function formatPrice(price: number | null) {
    if (price === null) {
      return '50.0¢'
    }
    return price < 1 ? `${(price * 100).toFixed(1)}¢` : `${price.toFixed(2)}`
  }

  function formatAmount(amount: number) {
    return amount.toLocaleString('en-US')
  }

  function formatTotalValue(totalValue: number) {
    return totalValue < 1 ? `${(totalValue * 100).toFixed(0)}¢` : `${totalValue.toFixed(2)}`
  }

  function retryInfiniteScroll() {
    setInfiniteScrollError(null)
    fetchNextPage().catch((error) => {
      setInfiniteScrollError(error.message || 'Failed to load more activity')
    })
  }

  if (hasInitialError) {
    return (
      <div className="mt-6">
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Internal server error</AlertTitle>
          <AlertDescription>
            <Button
              type="button"
              onClick={() => refetch()}
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
    <div ref={parentRef} className="mt-6 grid gap-6">
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

      {loading && (
        <>
          <ProfileLinkSkeleton showDate={true} showChildren={true} />
          <ProfileLinkSkeleton showDate={true} showChildren={true} />
          <ProfileLinkSkeleton showDate={true} showChildren={true} />
        </>
      )}

      {!loading && activities.length === 0 && (
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
      )}

      {!loading && activities.length > 0 && (
        <div>
          <div
            className="divide-y divide-border"
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
                  <ProfileLink
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
                      <span className={`ml-1 text-sm font-semibold ${
                        activity.outcome.index === OUTCOME_INDEX.YES
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
                </div>
              )
            })}
          </div>

          {isFetchingNextPage && (
            <>
              <ProfileLinkSkeleton showDate={true} showChildren={true} />
              <ProfileLinkSkeleton showDate={true} showChildren={true} />
              <ProfileLinkSkeleton showDate={true} showChildren={true} />
            </>
          )}

          {infiniteScrollError && (
            <div className="mt-4">
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Failed to load more activity</AlertTitle>
                <AlertDescription>
                  <Button
                    type="button"
                    onClick={retryInfiniteScroll}
                    size="sm"
                    variant="link"
                    className="-ml-3"
                  >
                    Try again
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
