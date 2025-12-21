'use client'

import type { Event } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { OUTCOME_INDEX } from '@/lib/constants'
import { fetchUserActivityData, mapDataApiActivityToActivityOrder } from '@/lib/data-api/user'
import { formatCurrency, formatSharePriceLabel, formatTimeAgo, fromMicro, sharesFormatter } from '@/lib/formatters'
import { getUserPublicAddress } from '@/lib/user-address'
import { cn } from '@/lib/utils'
import { useIsSingleMarket } from '@/stores/useOrder'
import { useUser } from '@/stores/useUser'

interface EventMarketHistoryProps {
  market: Event['markets'][number]
}

export default function EventMarketHistory({ market }: EventMarketHistoryProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [scrollMargin, setScrollMargin] = useState(0)
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const user = useUser()
  const isSingleMarket = useIsSingleMarket()
  const userAddress = getUserPublicAddress(user)

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
    queryKey: ['user-market-activity', userAddress, market.condition_id],
    queryFn: ({ pageParam = 0, signal }) =>
      fetchUserActivityData({
        pageParam,
        userAddress,
        conditionId: market.condition_id,
        signal,
      }).then(activities => activities.map(mapDataApiActivityToActivityOrder)),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 50) {
        return allPages.reduce((total, page) => total + page.length, 0)
      }

      return undefined
    },
    enabled: Boolean(userAddress && market.condition_id),
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })

  const activities = useMemo(
    () => (data?.pages.flat() ?? [])
      .filter(activity =>
        activity.market.condition_id === market.condition_id
        && activity.type === 'trade'),
    [data?.pages, market.condition_id],
  )
  const isLoadingInitial = status === 'pending'
  const hasInitialError = status === 'error'

  const virtualizer = useWindowVirtualizer({
    count: activities.length,
    estimateSize: () => {
      if (typeof window !== 'undefined') {
        return window.innerWidth < 768 ? 72 : 60
      }
      return 60
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

  if (!userAddress) {
    return <></>
  }

  if (hasInitialError) {
    return (
      <section className="rounded-xl border border-border/60 bg-background/80">
        <div className="px-4 py-4">
          <h3 className="text-lg font-semibold text-foreground">History</h3>
        </div>
        <div className="border-t border-border/60 px-4 py-4">
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
      </section>
    )
  }

  if (isLoadingInitial || activities.length === 0) {
    return (
      isSingleMarket
        ? <></>
        : (
            <div className={`
              flex min-h-16 items-center justify-center rounded border border-dashed border-border px-4 text-center
              text-sm text-muted-foreground
            `}
            >
              No activity for this outcome.
            </div>
          )
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-background/80">
      <div className="px-4 py-4">
        <h3 className="text-lg font-semibold text-foreground">History</h3>
      </div>
      <div ref={parentRef}>
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

            const sharesValue = Number.parseFloat(fromMicro(activity.amount, 4))
            const sharesLabel = Number.isFinite(sharesValue)
              ? sharesFormatter.format(sharesValue)
              : '—'
            const outcomeColorClass = activity.outcome.index === OUTCOME_INDEX.YES ? 'text-yes' : 'text-no'
            const actionLabel = activity.side === 'sell' ? 'Sold' : 'Bought'
            const priceLabel = formatSharePriceLabel(Number(activity.price), { fallback: '—' })
            const totalValue = Number(activity.total_value) / 1e6
            const totalValueLabel = formatCurrency(totalValue, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
            const timeAgoLabel = formatTimeAgo(activity.created_at)
            const fullDateLabel = new Date(activity.created_at).toLocaleString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })

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
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-foreground">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-semibold">
                      {actionLabel}
                    </span>
                    <span className={cn('font-semibold', outcomeColorClass)}>
                      {sharesLabel}
                      {' '}
                      {activity.outcome.text}
                    </span>
                    <span>at</span>
                    <span className="font-semibold">
                      {priceLabel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (
                      {totalValueLabel}
                      )
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground" title={fullDateLabel}>
                    {timeAgoLabel}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {isFetchingNextPage && (
        <div className="border-t border-border/60 px-4 py-3 text-center text-xs text-muted-foreground">
          <Loader2Icon className="mr-2 inline size-4 animate-spin align-middle" />
          Loading more history...
        </div>
      )}

      {infiniteScrollError && (
        <div className="border-t border-border/60 px-4 py-3">
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
    </section>
  )
}
