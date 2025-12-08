'use client'

import type { Event, UserPosition } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { AlertCircleIcon, ShareIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ORDER_SIDE, OUTCOME_INDEX } from '@/lib/constants'
import { fetchUserPositionsForMarket } from '@/lib/data-api/user'
import { formatAmountInputValue, formatCentsLabel, formatCurrency, formatPercent, fromMicro, sharesFormatter } from '@/lib/formatters'
import { getUserPrimaryAddress } from '@/lib/user-address'
import { cn } from '@/lib/utils'
import { useOrder } from '@/stores/useOrder'
import { useUser } from '@/stores/useUser'

interface EventMarketPositionsProps {
  market: Event['markets'][number]
}

const POSITIONS_GRID_TEMPLATE = 'minmax(120px,1fr) repeat(4, minmax(80px,1fr)) minmax(150px,auto)'

function MarketPositionRow({
  position,
  onSell,
}: {
  position: UserPosition
  onSell: (position: UserPosition) => void
}) {
  const outcomeText = position.outcome_text
    || (position.outcome_index === 1 ? 'No' : 'Yes')
  const normalizedOutcome = outcomeText?.toLowerCase() ?? ''
  const explicitOutcomeIndex = typeof position.outcome_index === 'number' ? position.outcome_index : undefined
  const resolvedOutcomeIndex = explicitOutcomeIndex != null
    ? explicitOutcomeIndex
    : normalizedOutcome === 'no'
      ? OUTCOME_INDEX.NO
      : OUTCOME_INDEX.YES
  const isYesOutcome = resolvedOutcomeIndex === OUTCOME_INDEX.YES
  const quantity = typeof position.total_shares === 'number' ? position.total_shares : 0
  const formattedQuantity = quantity > 0
    ? sharesFormatter.format(quantity)
    : '—'
  const averagePrice = Number(fromMicro(String(position.average_position), 6))
  const averageLabel = formatCentsLabel(averagePrice, { fallback: '—' })
  const totalValue = Number(fromMicro(String(position.total_position_value), 2))
  const valueLabel = formatCurrency(totalValue, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const baseCostValue = typeof position.total_position_cost === 'number'
    ? Number(fromMicro(String(position.total_position_cost), 2))
    : null
  const shouldSplitCost = Boolean(position.opposite_outcome_text)
  const adjustedCostValue = baseCostValue != null
    ? Number((shouldSplitCost ? baseCostValue / 2 : baseCostValue).toFixed(2))
    : null
  const costLabel = adjustedCostValue != null
    ? formatCurrency(adjustedCostValue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null
  const profitLossValue = typeof position.profit_loss_value === 'number'
    ? Number(fromMicro(String(position.profit_loss_value), 2))
    : baseCostValue != null
      ? Number((totalValue - baseCostValue).toFixed(2))
      : 0
  const hasPercentSource = typeof position.profit_loss_percent === 'number'
  const percentSource: number = hasPercentSource
    ? Number(position.profit_loss_percent)
    : baseCostValue != null && baseCostValue !== 0
      ? (profitLossValue / baseCostValue) * 100
      : 0
  const normalizedPercent = hasPercentSource && Math.abs(percentSource) <= 1
    ? percentSource * 100
    : percentSource
  const percentDigits = Math.abs(normalizedPercent) >= 10 ? 0 : 1
  const percentLabel = formatPercent(Math.abs(normalizedPercent), { digits: percentDigits })
  const isPositive = profitLossValue >= 0
  const isNeutralReturn = Math.abs(profitLossValue) < 0.005
  const neutralReturnLabel = formatCurrency(Math.abs(profitLossValue), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const displayedReturnValue = isNeutralReturn
    ? neutralReturnLabel
    : `${isPositive ? '+' : '-'}${neutralReturnLabel}`
  const outcomeButtonLabel = outcomeText || (isYesOutcome ? 'Yes' : 'No')

  const returnColorClass = isPositive ? 'text-yes' : 'text-no'

  return (
    <div
      className="grid items-center gap-3 px-3 py-1 text-[11px] leading-tight text-foreground sm:text-[12px]"
      style={{ gridTemplateColumns: POSITIONS_GRID_TEMPLATE }}
    >
      <div className="flex items-center">
        <span
          className={cn(
            `
              inline-flex min-w-[48px] justify-center rounded-sm px-3 py-1 text-[12px] leading-none font-semibold
              tracking-wide
            `,
            isYesOutcome ? 'bg-yes/15 text-yes-foreground' : 'bg-no/15 text-no-foreground',
          )}
        >
          {outcomeButtonLabel}
        </span>
      </div>
      <div className="text-center text-[11px] leading-tight font-semibold sm:text-sm">
        {formattedQuantity}
      </div>
      <div className="text-center text-[11px] leading-tight font-semibold sm:text-sm">
        {averageLabel}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] font-semibold sm:text-sm">{valueLabel}</span>
        <span className="text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
          {costLabel ? `Cost ${costLabel}` : 'Cost —'}
        </span>
      </div>
      <div className="flex items-center gap-1 text-[11px] leading-tight font-semibold sm:text-sm">
        <span
          className="inline-flex items-center"
          style={{ borderBottom: '1px dotted currentColor', paddingBottom: '0.04rem' }}
        >
          {displayedReturnValue}
        </span>
        {!isNeutralReturn && (
          <span className={cn('text-[10px] font-semibold', returnColorClass)}>
            (
            {isPositive ? '+' : '-'}
            {percentLabel}
            )
          </span>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-8 rounded-md border border-border/70 bg-transparent px-3 text-[12px] font-semibold',
            'hover:bg-muted/30 dark:border-white/30 dark:text-white dark:hover:bg-white/10',
          )}
          onClick={() => onSell(position)}
        >
          Sell
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Share ${outcomeButtonLabel} position`}
          className={cn(
            'h-8 w-8 rounded-md border border-border/70 bg-transparent text-foreground',
            'hover:bg-muted/30 dark:border-white/30 dark:text-white dark:hover:bg-white/10',
          )}
        >
          <ShareIcon className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export default function EventMarketPositions({ market }: EventMarketPositionsProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const user = useUser()
  const userAddress = getUserPrimaryAddress(user)
  const [scrollMargin, setScrollMargin] = useState(0)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const setOrderMarket = useOrder(state => state.setMarket)
  const setOrderOutcome = useOrder(state => state.setOutcome)
  const setOrderSide = useOrder(state => state.setSide)
  const setOrderAmount = useOrder(state => state.setAmount)
  const setIsMobileOrderPanelOpen = useOrder(state => state.setIsMobileOrderPanelOpen)
  const orderInputRef = useOrder(state => state.inputRef)
  const setOrderUserShares = useOrder(state => state.setUserShares)

  useEffect(() => {
    queueMicrotask(() => {
      setHasInitialized(false)
      setInfiniteScrollError(null)
    })
  }, [market.condition_id])

  useEffect(() => {
    if (parentRef.current) {
      setScrollMargin(parentRef.current.offsetTop)
    }
  }, [market.condition_id])

  const positionStatus = market.is_active && !market.is_resolved ? 'active' : 'closed'

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['user-market-positions', userAddress, market.condition_id, positionStatus],
    queryFn: ({ pageParam = 0, signal }) =>
      fetchUserPositionsForMarket({
        pageParam,
        userAddress,
        conditionId: market.condition_id,
        status: positionStatus,
        signal,
      }),
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

  const positions = useMemo(() => data?.pages.flat() ?? [], [data?.pages])
  const loading = status === 'pending' && Boolean(user?.address)
  const hasInitialError = status === 'error' && Boolean(user?.address)

  const aggregatedShares = useMemo(() => {
    const map: Record<string, Record<typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO, number>> = {}

    positions.forEach((positionItem) => {
      const quantity = typeof positionItem.total_shares === 'number' ? positionItem.total_shares : null
      if (!quantity || quantity <= 0) {
        return
      }
      const conditionId = positionItem.market?.condition_id || market.condition_id
      if (!conditionId) {
        return
      }

      const normalizedOutcome = positionItem.outcome_text?.toLowerCase()
      const explicitOutcomeIndex = typeof positionItem.outcome_index === 'number' ? positionItem.outcome_index : undefined
      const resolvedOutcomeIndex = explicitOutcomeIndex != null
        ? explicitOutcomeIndex
        : normalizedOutcome === 'no'
          ? OUTCOME_INDEX.NO
          : OUTCOME_INDEX.YES

      if (!map[conditionId]) {
        map[conditionId] = {
          [OUTCOME_INDEX.YES]: 0,
          [OUTCOME_INDEX.NO]: 0,
        }
      }

      const bucket = resolvedOutcomeIndex === OUTCOME_INDEX.NO ? OUTCOME_INDEX.NO : OUTCOME_INDEX.YES
      map[conditionId][bucket] += quantity
    })

    return map
  }, [market.condition_id, positions])

  useEffect(() => {
    if (Object.keys(aggregatedShares).length > 0) {
      setOrderUserShares(aggregatedShares)
    }
  }, [aggregatedShares, setOrderUserShares])

  const virtualizer = useWindowVirtualizer({
    count: positions.length,
    estimateSize: () => {
      if (typeof window !== 'undefined') {
        return window.innerWidth < 768 ? 62 : 54
      }
      return 54
    },
    scrollMargin,
    overscan: 5,
    onChange: (instance) => {
      if (!hasInitialized) {
        setHasInitialized(true)
        return
      }

      if (!positions.length) {
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

  const handleSell = useCallback((positionItem: UserPosition) => {
    if (!market) {
      return
    }

    const normalizedOutcome = positionItem.outcome_text?.toLowerCase()
    const explicitOutcomeIndex = typeof positionItem.outcome_index === 'number' ? positionItem.outcome_index : undefined
    const resolvedOutcomeIndex = explicitOutcomeIndex != null
      ? explicitOutcomeIndex
      : normalizedOutcome === 'no'
        ? OUTCOME_INDEX.NO
        : OUTCOME_INDEX.YES
    const targetOutcome = market.outcomes.find(outcome => outcome.outcome_index === resolvedOutcomeIndex)
      ?? market.outcomes[0]

    setOrderMarket(market)
    if (targetOutcome) {
      setOrderOutcome(targetOutcome)
    }
    setOrderSide(ORDER_SIDE.SELL)

    const shares = typeof positionItem.total_shares === 'number' ? positionItem.total_shares : 0
    if (shares > 0) {
      setOrderAmount(formatAmountInputValue(shares))
    }
    else {
      setOrderAmount('')
    }

    if (isMobile) {
      setIsMobileOrderPanelOpen(true)
    }
    else {
      orderInputRef?.current?.focus()
    }
  }, [isMobile, market, orderInputRef, setIsMobileOrderPanelOpen, setOrderAmount, setOrderMarket, setOrderOutcome, setOrderSide])

  if (!userAddress) {
    return null
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

  if (loading || positions.length === 0) {
    return null
  }

  return (
    <section
      ref={parentRef}
      className="overflow-hidden rounded-xl border border-border/60 bg-background/80"
    >
      <div className="px-4 py-4">
        <h3 className="text-lg font-semibold text-foreground">Positions</h3>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px] px-2 pb-2">
          <div
            className={`
              grid h-9 items-center gap-3 border-b border-border/60 bg-background px-3 text-[10px] font-semibold
              tracking-wide text-muted-foreground uppercase
            `}
            style={{ gridTemplateColumns: POSITIONS_GRID_TEMPLATE }}
          >
            <span>Outcome</span>
            <span className="text-center">Qty</span>
            <span className="text-center">Avg</span>
            <span>Value</span>
            <span>Return</span>
            <span aria-hidden="true" />
          </div>
          <div
            className="relative mt-2"
            style={{
              height: `${virtualizer.getTotalSize()}px`,
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
                    transform: `translateY(${virtualItem.start - (virtualizer.options.scrollMargin ?? 0)}px)`,
                  }}
                >
                  <MarketPositionRow position={position} onSell={handleSell} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {isFetchingNextPage && (
        <div className="border-t border-border/60 px-4 py-3 text-center text-xs text-muted-foreground">
          Loading more positions...
        </div>
      )}

      {infiniteScrollError && (
        <div className="border-t border-border/60 px-4 py-3">
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
    </section>
  )
}
