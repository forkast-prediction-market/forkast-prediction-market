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
  collapsible?: boolean
  eventSlug?: string
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

export default function EventMarketHistory({ market, collapsible = true }: EventMarketHistoryProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const isCollapsible = collapsible !== false
  const [historyExpanded, setHistoryExpanded] = useState(!isCollapsible)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [scrollMargin, setScrollMargin] = useState(0)
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const user = useUser()
  const emptyHeightClass = 'min-h-16'

  useEffect(() => {
    queueMicrotask(() => setInfiniteScrollError(null))
  }, [market.condition_id])

  useEffect(() => {
    queueMicrotask(() => {
      if (parentRef.current && (historyExpanded || !isCollapsible)) {
        setScrollMargin(parentRef.current.offsetTop)
      }
      setHasInitialized(false)
    })
  }, [historyExpanded, isCollapsible, market.condition_id])

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
    enabled: Boolean(user?.address && market.condition_id && (historyExpanded || !isCollapsible)),
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })

  const activities = data?.pages.flat() ?? []
  const isExpanded = historyExpanded || !isCollapsible
  const loading = isExpanded && status === 'pending'
  const hasInitialError = isExpanded && status === 'error'

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

  const content = (
    <>
      {!user?.address
        ? (
            <div className="pt-0 text-center text-sm text-muted-foreground">
              Sign in to view your trading history for this market.
            </div>
          )
        : hasInitialError
          ? (
              <div className="pt-0">
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
          : (
              <div ref={parentRef} className="grid gap-4 pt-0">
                {loading && (
                  <div className={`flex ${emptyHeightClass}
                    items-center justify-center rounded-lg border border-dashed border-border px-4 text-sm
                    text-muted-foreground
                  `}
                  >
                    Loading history...
                  </div>
                )}

                {!loading && activities.length === 0 && (
                  <div className={`flex ${emptyHeightClass}
                    items-center justify-center rounded-lg border border-dashed border-border px-4 text-center text-sm
                    text-muted-foreground
                  `}
                  >
                    No trading activity yet for this market.
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
            )}
    </>
  )

  if (!isCollapsible) {
    return (
      <div className="grid gap-4">
        {content}
      </div>
    )
  }

  return (
    <div className="rounded-lg border transition-all duration-200 ease-in-out">
      <button
        type="button"
        onClick={() => {
          setHistoryExpanded((current) => {
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
        aria-expanded={historyExpanded}
      >
        <span className="text-lg font-medium">History</span>
        <span
          aria-hidden="true"
          className={`
            pointer-events-none flex size-8 items-center justify-center rounded-md border border-border/60 bg-background
            text-muted-foreground transition
            ${historyExpanded ? 'bg-muted/50' : ''}
          `}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-transform ${historyExpanded ? 'rotate-180' : ''}`}
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

      {historyExpanded && (
        <div className="border-t border-border/30 px-3 pt-3 pb-3">
          {content}
        </div>
      )}
    </div>
  )
}
