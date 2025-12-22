'use client'

import type { Event } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { POLYGON_SCAN_BASE } from '@/lib/constants'
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
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const user = useUser()
  const isSingleMarket = useIsSingleMarket()
  const userAddress = getUserPublicAddress(user)

  useEffect(() => {
    queueMicrotask(() => setInfiniteScrollError(null))
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

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (
          entry?.isIntersecting
          && hasNextPage
          && !isFetchingNextPage
          && !infiniteScrollError
        ) {
          fetchNextPage().catch((error) => {
            setInfiniteScrollError(error.message || 'Failed to load more activity')
          })
        }
      },
      { rootMargin: '200px 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, infiniteScrollError, isFetchingNextPage])

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
            <div className={cn(
              'flex min-h-16 items-center justify-center rounded border border-dashed border-border px-4 text-center',
              'text-sm text-muted-foreground',
            )}
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
      <div className="divide-y divide-border">
        {activities.map((activity) => {
          const sharesValue = Number.parseFloat(fromMicro(activity.amount, 4))
          const sharesLabel = Number.isFinite(sharesValue)
            ? sharesFormatter.format(sharesValue)
            : '—'
          const outcomeColorClass = (activity.outcome.text || '').toLowerCase() === 'yes'
            ? 'text-yes'
            : 'text-no'
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
          const txUrl = activity.tx_hash ? `${POLYGON_SCAN_BASE}/tx/${activity.tx_hash}` : null

          return (
            <div
              key={activity.id}
              className={cn('flex h-11 items-center justify-between gap-3 px-3 text-sm leading-none text-foreground')}
            >
              <div className="flex min-w-0 items-center gap-2 overflow-hidden leading-none whitespace-nowrap">
                <span className="font-semibold">{actionLabel}</span>
                <span className={cn('font-semibold', outcomeColorClass)}>
                  {sharesLabel}
                  {' '}
                  {activity.outcome.text}
                </span>
                <span className="text-foreground">at</span>
                <span className="font-semibold">{priceLabel}</span>
                <span className="text-muted-foreground">
                  (
                  {totalValueLabel}
                  )
                </span>
              </div>
              {txUrl
                ? (
                    <a
                      href={txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
                        text-xs whitespace-nowrap text-muted-foreground transition-colors
                        hover:text-foreground
                      `}
                      title={fullDateLabel}
                    >
                      {timeAgoLabel}
                    </a>
                  )
                : (
                    <span className="text-xs whitespace-nowrap text-muted-foreground" title={fullDateLabel}>
                      {timeAgoLabel}
                    </span>
                  )}
            </div>
          )
        })}
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

      <div ref={loadMoreRef} className="h-1 w-full" aria-hidden />
    </section>
  )
}
