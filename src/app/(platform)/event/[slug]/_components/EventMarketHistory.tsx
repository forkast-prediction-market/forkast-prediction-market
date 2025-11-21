'use client'

import type { ActivityOrder, Event } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { OUTCOME_INDEX } from '@/lib/constants'
import { formatSharePriceLabel, fromMicro } from '@/lib/formatters'
import { useUser } from '@/stores/useUser'

interface EventMarketHistoryProps {
  market: Event['markets'][number]
}

interface FetchMarketHistoryParams {
  pageParam: number
  userAddress: string
  conditionId: string
}

async function fetchMarketHistory({
  pageParam,
  userAddress,
  conditionId,
}: FetchMarketHistoryParams): Promise<ActivityOrder[]> {
  const params = new URLSearchParams({
    limit: '50',
    offset: pageParam.toString(),
  })

  if (conditionId) {
    params.set('conditionId', conditionId)
  }

  const response = await fetch(`/api/users/${encodeURIComponent(userAddress)}/activity?${params}`)

  if (!response.ok) {
    throw new Error('Failed to fetch activity data')
  }

  return await response.json()
}

function formatTotalValue(totalValueMicro: number) {
  const totalValue = totalValueMicro / 1e6
  return formatSharePriceLabel(totalValue, { fallback: '0¢' })
}

export default function EventMarketHistory({ market }: EventMarketHistoryProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [scrollMargin, setScrollMargin] = useState(0)
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const user = useUser()

  useEffect(() => {
    queueMicrotask(() => setInfiniteScrollError(null))
  }, [market.condition_id])

  useEffect(() => {
    queueMicrotask(() => {
      if (parentRef.current) {
        setScrollMargin(parentRef.current.offsetTop)
      }
      setHasInitialized(false)
    })
  }, [market.condition_id])

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['user-market-activity', user?.address, market.condition_id],
    queryFn: ({ pageParam = 0 }) =>
      fetchMarketHistory({
        pageParam,
        userAddress: user?.address ?? '',
        conditionId: market.condition_id,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 50) {
        return allPages.reduce((total, page) => total + page.length, 0)
      }

      return undefined
    },
    enabled: Boolean(user?.address && market.condition_id),
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

  function retryInfiniteScroll() {
    setInfiniteScrollError(null)
    fetchNextPage().catch((error) => {
      setInfiniteScrollError(error.message || 'Failed to load more activity')
    })
  }

  if (!user?.address) {
    return (
      <div className="mt-6 rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
        Sign in to view your trading history for this market.
      </div>
    )
  }

  if (hasInitialError) {
    return (
      <div className="mt-6">
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Failed to load activity</AlertTitle>
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
    <div ref={parentRef} className="grid gap-6">
      {loading && (
        <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading history...
        </div>
      )}

      {!loading && activities.length === 0 && (
        <div className="text-center">
          <div className="text-sm text-muted-foreground">
            No trading activity yet for this market.
          </div>
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
                  <div className="flex items-start gap-2 rounded-lg px-1 py-3">
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {activity.side === 'buy' ? 'bought' : 'sold'}
                        {' '}
                        <span className="font-semibold text-foreground">{fromMicro(activity.amount)}</span>
                        {' '}
                        <span className={`font-semibold ${
                          activity.outcome.index === OUTCOME_INDEX.YES
                            ? 'text-yes'
                            : 'text-no'
                        }`}
                        >
                          {activity.outcome.text}
                        </span>
                        {' '}
                        for
                        {' '}
                        <span className="font-semibold text-foreground">{activity.market.title || market.title}</span>
                        {' '}
                        at
                        {' '}
                        <span className="font-semibold text-foreground">
                          {formatSharePriceLabel(Number(activity.price))}
                        </span>
                        {' '}
                        (
                        {formatTotalValue(activity.total_value)}
                        )
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {isFetchingNextPage && (
            <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading more history...
            </div>
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
