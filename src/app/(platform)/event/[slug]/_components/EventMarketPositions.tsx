'use client'

import type { Event, UserPosition } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { AlertCircleIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { fromMicro } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useUser } from '@/stores/useUser'

interface EventMarketPositionsProps {
  market: Event['markets'][number]
  collapsible?: boolean
}

interface FetchMarketPositionsParams {
  pageParam: number
  userAddress: string
  conditionId: string
  signal?: AbortSignal
}

async function fetchMarketPositions({
  pageParam,
  userAddress,
  conditionId,
  signal,
}: FetchMarketPositionsParams): Promise<UserPosition[]> {
  const params = new URLSearchParams({
    limit: '50',
    offset: pageParam.toString(),
  })

  if (conditionId) {
    params.set('conditionId', conditionId)
  }

  const response = await fetch(`/api/users/${encodeURIComponent(userAddress)}/positions?${params}`, {
    signal,
  })

  if (!response.ok) {
    throw new Error('Failed to fetch positions')
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

function MarketPositionRow({ position }: { position: UserPosition }) {
  const isActive = position.market.is_active && !position.market.is_resolved
  const lastActiveLabel = position.last_activity_at
    ? formatRelativeTime(new Date(position.last_activity_at))
    : '—'

  return (
    <div className={`
      flex flex-col gap-3 border-b border-border px-3 py-3
      last:border-b-0
      sm:flex-row sm:items-center sm:gap-4 sm:px-4
    `}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs font-medium sm:text-sm">
          <span className="line-clamp-2 text-foreground">{position.market.title}</span>
          <span className={cn(
            'inline-flex min-w-[68px] justify-center rounded-md px-2 py-0.5 text-[11px] font-semibold',
            isActive
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200',
          )}
          >
            {isActive ? 'Active' : 'Closed'}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {position.order_count}
            {' '}
            order
            {position.order_count === 1 ? '' : 's'}
          </span>
          <span aria-hidden="true">•</span>
          <span>
            Last activity:
            {' '}
            {lastActiveLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-6 sm:flex-none">
        <div className="text-right">
          <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Avg</div>
          <div className="text-sm font-semibold">
            $
            {fromMicro(String(position.average_position), 2)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] tracking-wide text-muted-foreground uppercase">Value</div>
          <div className="text-sm font-semibold">
            $
            {fromMicro(String(position.total_position_value), 2)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EventMarketPositions({ market, collapsible = false }: EventMarketPositionsProps) {
  const emptyHeightClass = 'min-h-16'
  const parentRef = useRef<HTMLDivElement | null>(null)
  const user = useUser()
  const [scrollMargin, setScrollMargin] = useState(0)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const isCollapsible = collapsible !== false
  const [positionsExpanded, setPositionsExpanded] = useState(!isCollapsible)

  useEffect(() => {
    queueMicrotask(() => {
      setHasInitialized(false)
      setInfiniteScrollError(null)
      setPositionsExpanded(!isCollapsible)
    })
  }, [isCollapsible, market.condition_id])

  useEffect(() => {
    if (parentRef.current && (positionsExpanded || !isCollapsible)) {
      setScrollMargin(parentRef.current.offsetTop)
    }
  }, [isCollapsible, market.condition_id, positionsExpanded])

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['user-market-positions', user?.address, market.condition_id],
    queryFn: ({ pageParam = 0, signal }) =>
      fetchMarketPositions({
        pageParam,
        userAddress: user?.address ?? '',
        conditionId: market.condition_id,
        signal,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 50) {
        return allPages.reduce((total, page) => total + page.length, 0)
      }
      return undefined
    },
    enabled: Boolean(user?.address && market.condition_id && (positionsExpanded || !isCollapsible)),
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })

  const positions = useMemo(() => data?.pages.flat() ?? [], [data?.pages])
  const loading = status === 'pending' && Boolean(user?.address)
  const hasInitialError = status === 'error' && Boolean(user?.address)

  const virtualizer = useWindowVirtualizer({
    count: positions.length,
    estimateSize: () => {
      if (typeof window !== 'undefined') {
        return window.innerWidth < 768 ? 110 : 76
      }
      return 76
    },
    scrollMargin,
    overscan: 5,
    onChange: (instance) => {
      if (!hasInitialized) {
        setHasInitialized(true)
        return
      }

      if (!positions.length || (isCollapsible && !positionsExpanded)) {
        return
      }

      const items = instance.getVirtualItems()
      const lastItem = items[items.length - 1]
      const shouldLoadMore = lastItem
        && lastItem.index >= positions.length - 2
        && hasNextPage
        && !isFetchingNextPage
        && !infiniteScrollError
        && status !== 'pending'

      if (shouldLoadMore) {
        fetchNextPage().catch((error: any) => {
          if (error?.name === 'CanceledError' || error?.name === 'AbortError') {
            return
          }
          setInfiniteScrollError(error?.message || 'Failed to load more positions')
        })
      }
    },
  })

  if (!user?.address) {
    return (
      <div className={`
        rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground
      `}
      >
        Connect your wallet to view your positions for this market.
      </div>
    )
  }

  if (hasInitialError) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Failed to load positions</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>We couldn&apos;t fetch your positions for this market.</span>
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
          Loading positions...
        </div>
      )}

      {!loading && positions.length === 0 && (
        <div className={`flex ${emptyHeightClass}
          items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm
          text-muted-foreground
        `}
        >
          You don&apos;t have any positions in this market yet.
        </div>
      )}

      {!loading && positions.length > 0 && (
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
              const position = positions[virtualItem.index]
              if (!position) {
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
                  <MarketPositionRow position={position} />
                </div>
              )
            })}
          </div>

          {isFetchingNextPage && (
            <div className="flex items-center justify-center px-4 py-4 text-sm text-muted-foreground">
              Loading more positions...
            </div>
          )}

          {!hasNextPage && positions.length > 0 && !isFetchingNextPage && (
            <div className="border-t bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
              All positions for this market are loaded.
            </div>
          )}

          {infiniteScrollError && (
            <div className="border-t px-4 py-3">
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>Couldn&apos;t load more positions</AlertTitle>
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
                        setInfiniteScrollError(error?.message || 'Failed to load more positions')
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
          setPositionsExpanded((current) => {
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
        aria-expanded={positionsExpanded}
      >
        <span className="text-lg font-medium">Positions</span>
        <span
          aria-hidden="true"
          className={`
            pointer-events-none flex size-8 items-center justify-center rounded-md border border-border/60 bg-background
            text-muted-foreground transition
            ${positionsExpanded ? 'bg-muted/50' : ''}
          `}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-transform ${positionsExpanded ? 'rotate-180' : ''}`}
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

      {positionsExpanded && (
        <div className="border-t border-border/30 px-3 pt-3 pb-3">
          {content}
        </div>
      )}
    </div>
  )
}
