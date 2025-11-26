'use client'

import type { Event, UserOpenOrder } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { AlertCircleIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { formatSharePriceLabel, fromMicro } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useUser } from '@/stores/useUser'

interface EventMarketOpenOrdersProps {
  market: Event['markets'][number]
  eventSlug: string
  collapsible?: boolean
}

interface FetchOpenOrdersParams {
  pageParam: number
  eventSlug: string
  conditionId: string
  signal?: AbortSignal
}

async function fetchOpenOrders({
  pageParam,
  eventSlug,
  conditionId,
  signal,
}: FetchOpenOrdersParams): Promise<UserOpenOrder[]> {
  const params = new URLSearchParams({
    limit: '50',
    offset: pageParam.toString(),
  })

  if (conditionId) {
    params.set('conditionId', conditionId)
  }

  const response = await fetch(`/api/events/${encodeURIComponent(eventSlug)}/open-orders?${params}`, {
    signal,
  })

  if (!response.ok) {
    throw new Error('Failed to fetch open orders')
  }

  const payload = await response.json()
  return payload.data ?? []
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) {
    return 'Just now'
  }
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays === 1) {
    return 'Yesterday'
  }
  if (diffInDays < 30) {
    return `${diffInDays}d ago`
  }

  return date.toLocaleDateString()
}

function OpenOrderRow({ order }: { order: UserOpenOrder }) {
  const amountMicro = order.side === 'buy' ? order.taker_amount : order.maker_amount
  const sideLabel = order.side === 'buy' ? 'Buy' : 'Sell'
  const placedLabel = order.created_at ? formatRelativeTime(new Date(order.created_at)) : '—'
  const priceLabel = formatSharePriceLabel(order.price, { fallback: '—' })
  const sizeLabel = fromMicro(String(amountMicro ?? 0), 2)

  return (
    <div className={`
      flex flex-col gap-3 border-b border-border px-3 py-3
      last:border-b-0
      sm:flex-row sm:items-center sm:gap-4 sm:px-4
    `}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs font-medium sm:text-sm">
          <span className={cn(
            'inline-flex min-w-[56px] justify-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase',
            order.side === 'buy'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
          )}
          >
            {sideLabel}
          </span>
          <span className="line-clamp-2 text-foreground">{order.outcome.text || 'Outcome'}</span>
          <span className={`
            inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground
            uppercase
          `}
          >
            {order.type}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            Placed
            {' '}
            {placedLabel}
          </span>
          <span aria-hidden="true">•</span>
          <span className="capitalize">
            Status:
            {' '}
            {order.status || 'live'}
          </span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4 sm:flex-none">
        <div className="text-right">
          <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Price</div>
          <div className="text-sm font-semibold">{priceLabel}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Size</div>
          <div className="text-sm font-semibold">
            $
            {sizeLabel}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            // UI-only placeholder until cancel wiring is added.
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

export default function EventMarketOpenOrders({ market, eventSlug, collapsible = false }: EventMarketOpenOrdersProps) {
  const emptyHeightClass = 'min-h-16'
  const parentRef = useRef<HTMLDivElement | null>(null)
  const user = useUser()
  const [scrollMargin, setScrollMargin] = useState(0)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const isCollapsible = collapsible !== false
  const [ordersExpanded, setOrdersExpanded] = useState(!isCollapsible)

  useEffect(() => {
    queueMicrotask(() => {
      setHasInitialized(false)
      setInfiniteScrollError(null)
      setOrdersExpanded(!isCollapsible)
    })
  }, [isCollapsible, market.condition_id, eventSlug])

  useEffect(() => {
    if (parentRef.current && (ordersExpanded || !isCollapsible)) {
      setScrollMargin(parentRef.current.offsetTop)
    }
  }, [isCollapsible, market.condition_id, eventSlug, ordersExpanded])

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['user-open-orders', user?.id, eventSlug, market.condition_id],
    queryFn: ({ pageParam = 0, signal }) =>
      fetchOpenOrders({
        pageParam,
        eventSlug,
        conditionId: market.condition_id,
        signal,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 50) {
        return allPages.reduce((total, page) => total + page.length, 0)
      }
      return undefined
    },
    enabled: Boolean(user?.id && eventSlug && market.condition_id && (ordersExpanded || !isCollapsible)),
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })

  const orders = useMemo(() => data?.pages.flat() ?? [], [data?.pages])
  const isExpanded = ordersExpanded || !isCollapsible
  const loading = isExpanded && status === 'pending'
  const hasInitialError = isExpanded && status === 'error'

  const virtualizer = useWindowVirtualizer({
    count: orders.length,
    estimateSize: () => {
      if (typeof window !== 'undefined') {
        return window.innerWidth < 768 ? 120 : 80
      }
      return 80
    },
    scrollMargin,
    overscan: 5,
    onChange: (instance) => {
      if (!hasInitialized) {
        setHasInitialized(true)
        return
      }

      if (!orders.length || (isCollapsible && !ordersExpanded)) {
        return
      }

      const items = instance.getVirtualItems()
      const lastItem = items[items.length - 1]
      const shouldLoadMore = lastItem
        && lastItem.index >= orders.length - 2
        && hasNextPage
        && !isFetchingNextPage
        && !infiniteScrollError
        && status !== 'pending'

      if (shouldLoadMore) {
        fetchNextPage().catch((error: any) => {
          if (error?.name === 'CanceledError' || error?.name === 'AbortError') {
            return
          }
          setInfiniteScrollError(error?.message || 'Failed to load more open orders')
        })
      }
    },
  })

  if (!user?.id) {
    return (
      <div className={`
        rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground
      `}
      >
        Connect your wallet to view your open orders for this market.
      </div>
    )
  }

  if (hasInitialError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Failed to load open orders</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>We couldn&apos;t fetch your open orders for this market.</span>
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  const content = (
    <div ref={parentRef} className="grid gap-4">
      {loading && (
        <div className={`flex ${emptyHeightClass}
          items-center justify-center rounded-lg border border-dashed border-border px-4 text-sm text-muted-foreground
        `}
        >
          Loading open orders...
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className={`flex ${emptyHeightClass}
          items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm
          text-muted-foreground
        `}
        >
          You don&apos;t have any open orders for this market.
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div
            className="divide-y divide-border"
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
              width: '100%',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const order = orders[virtualItem.index]
              if (!order) {
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
                  <OpenOrderRow order={order} />
                </div>
              )
            })}
          </div>

          {isFetchingNextPage && (
            <div className="flex items-center justify-center px-4 py-4 text-sm text-muted-foreground">
              Loading more open orders...
            </div>
          )}

          {!hasNextPage && orders.length > 0 && !isFetchingNextPage && (
            <div className="border-t bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
              All open orders for this market are loaded.
            </div>
          )}

          {infiniteScrollError && (
            <div className="border-t px-4 py-3">
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Couldn&apos;t load more open orders</AlertTitle>
                <AlertDescription>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="-ml-3"
                    onClick={() => {
                      setInfiniteScrollError(null)
                      fetchNextPage().catch((error: any) => {
                        if (error?.name === 'CanceledError' || error?.name === 'AbortError') {
                          return
                        }
                        setInfiniteScrollError(error?.message || 'Failed to load more open orders')
                      })
                    }}
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

  if (!isCollapsible) {
    return content
  }

  return (
    <div className="rounded-lg border transition-all duration-200 ease-in-out">
      <button
        type="button"
        onClick={() => {
          setOrdersExpanded((current) => {
            const next = !current
            if (next) {
              setHasInitialized(false)
              setInfiniteScrollError(null)
            }
            return next
          })
        }}
        className={`
          flex w-full items-center justify-between p-4 text-left transition-colors
          hover:bg-muted/50
          focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
          focus-visible:outline-none
        `}
        aria-expanded={ordersExpanded}
      >
        <span className="text-lg font-medium">Open Orders</span>
        <span
          aria-hidden="true"
          className={`
            pointer-events-none flex size-8 items-center justify-center rounded-md border border-border/60 bg-background
            text-muted-foreground transition
            ${ordersExpanded ? 'bg-muted/50' : ''}
          `}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-transform ${ordersExpanded ? 'rotate-180' : ''}`}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {ordersExpanded && (
        <div className="border-t border-border/30 px-3 pt-3 pb-3">
          {content}
        </div>
      )}
    </div>
  )
}
