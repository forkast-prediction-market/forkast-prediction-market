'use client'

import type { Market, Outcome } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { ORDER_TYPE, OUTCOME_INDEX } from '@/lib/constants'
import { formatCentsLabel, sharesFormatter, toCents, usdFormatter } from '@/lib/formatters'
import { useOrder } from '@/stores/useOrder'

interface OrderBookLevel {
  side: 'ask' | 'bid'
  rawPrice: number
  priceCents: number
  shares: number
  total: number
  cumulativeShares: number
}

interface EventOrderBookProps {
  market: Market
  outcome?: Outcome
  summaries?: OrderBookSummariesResponse
  isLoadingSummaries: boolean
  lastPriceOverrideCents?: number | null
}

interface OrderbookLevelSummary {
  price: string
  size: string
}

interface OrderBookSummaryResponse {
  bids?: OrderbookLevelSummary[]
  asks?: OrderbookLevelSummary[]
  spread?: string
  last_trade_price?: string
  last_trade_side?: 'BUY' | 'SELL'
}

export type OrderBookSummariesResponse = Record<string, OrderBookSummaryResponse>

interface OrderBookSnapshot {
  asks: OrderBookLevel[]
  bids: OrderBookLevel[]
  lastPrice: number | null
  spread: number | null
  maxTotal: number
  outcomeLabel: string
}

const DEFAULT_MAX_LEVELS = 12

async function fetchOrderBookSummaries(tokenIds: string[]): Promise<OrderBookSummariesResponse> {
  if (!tokenIds.length) {
    return {}
  }

  const params = new URLSearchParams({ token_ids: tokenIds.join(',') })
  const response = await fetch(`/api/orderbook?${params.toString()}`, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error('Failed to load order book')
  }

  return response.json()
}

export function useOrderBookSummaries(tokenIds: string[], options?: { enabled?: boolean }) {
  const tokenIdsKey = tokenIds.slice().sort().join(',')
  const shouldEnable = options?.enabled ?? true

  return useQuery({
    queryKey: ['orderbook-summary', tokenIdsKey],
    queryFn: () => fetchOrderBookSummaries(tokenIds),
    enabled: tokenIds.length > 0 && shouldEnable,
    staleTime: 60_000,
    gcTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export default function EventOrderBook({
  market,
  outcome,
  summaries,
  isLoadingSummaries,
  lastPriceOverrideCents,
}: EventOrderBookProps) {
  const tokenId = outcome?.token_id || market.outcomes[0]?.token_id

  const summary = tokenId ? summaries?.[tokenId] ?? null : null
  const setType = useOrder(state => state.setType)
  const setLimitPrice = useOrder(state => state.setLimitPrice)
  const setLimitShares = useOrder(state => state.setLimitShares)
  const inputRef = useOrder(state => state.inputRef)
  const currentOrderType = useOrder(state => state.type)

  const {
    asks,
    bids,
    lastPrice,
    spread,
    maxTotal,
    outcomeLabel,
  } = useMemo(
    () => buildOrderBookSnapshot(summary, market, outcome, lastPriceOverrideCents),
    [summary, market, outcome, lastPriceOverrideCents],
  )

  const renderedAsks = useMemo(
    () => [...asks].sort((a, b) => b.priceCents - a.priceCents),
    [asks],
  )

  const handleLevelSelect = useCallback((level: OrderBookLevel) => {
    if (currentOrderType !== ORDER_TYPE.LIMIT) {
      setType(ORDER_TYPE.LIMIT)
    }
    setLimitPrice(level.priceCents.toFixed(1))

    if (level.side === 'ask') {
      setLimitShares(formatSharesInput(level.cumulativeShares))
    }

    queueMicrotask(() => inputRef?.current?.focus())
  }, [currentOrderType, setType, setLimitPrice, setLimitShares, inputRef])

  if (!tokenId) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        Order book data is unavailable for this outcome.
      </div>
    )
  }

  if (isLoadingSummaries) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Loading order book...
      </div>
    )
  }

  return (
    <div className="relative scrollbar-hide max-h-[360px] overflow-y-auto">
      <div className="px-2">
        <div
          className={`
            sticky top-0 z-[1] grid h-9 grid-cols-[40%_20%_20%_20%] items-center border-b border-border/60 bg-background
            px-4 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase
          `}
        >
          <div className="flex h-full items-center">
            <span>{`Trade ${outcomeLabel}`}</span>
          </div>
          <div className="flex h-full items-center justify-center">
            Price
          </div>
          <div className="flex h-full items-center justify-center">
            Shares
          </div>
          <div className="flex h-full items-center justify-center">
            Total
          </div>
        </div>

        {renderedAsks.length > 0
          ? (
              renderedAsks.map((level, index) => (
                <OrderBookRow
                  key={`ask-${level.priceCents}-${index}`}
                  level={level}
                  maxTotal={maxTotal}
                  showBadge={index === renderedAsks.length - 1 ? 'ask' : undefined}
                  onSelect={handleLevelSelect}
                />
              ))
            )
          : <OrderBookEmptyRow label="No asks" />}

        <div
          className={`
            sticky top-[36px] bottom-0 z-[1] grid h-9 cursor-pointer grid-cols-[40%_20%_20%_20%] items-center border-y
            border-border/60 bg-background px-4 text-xs font-medium text-muted-foreground transition-colors
            hover:bg-muted/60
            dark:hover:bg-white/10
          `}
          role="presentation"
        >
          <div className="flex h-full cursor-pointer items-center">
            Last:&nbsp;
            {formatCentsLabel(lastPrice)}
          </div>
          <div className="flex h-full cursor-pointer items-center justify-center">
            Spread:&nbsp;
            {formatCentsLabel(spread)}
          </div>
          <div className="flex h-full items-center justify-center" />
          <div className="flex h-full items-center justify-center" />
        </div>

        {bids.length > 0
          ? (
              bids.map((level, index) => (
                <OrderBookRow
                  key={`bid-${level.priceCents}-${index}`}
                  level={level}
                  maxTotal={maxTotal}
                  showBadge={index === 0 ? 'bid' : undefined}
                  onSelect={handleLevelSelect}
                />
              ))
            )
          : <OrderBookEmptyRow label="No bids" />}
      </div>
    </div>
  )
}

interface OrderBookRowProps {
  level: OrderBookLevel
  maxTotal: number
  showBadge?: 'ask' | 'bid'
  onSelect?: (level: OrderBookLevel) => void
}

function OrderBookRow({ level, maxTotal, showBadge, onSelect }: OrderBookRowProps) {
  const isAsk = level.side === 'ask'
  const backgroundClass = isAsk ? 'bg-no/25 dark:bg-no/20' : 'bg-yes/25 dark:bg-yes/20'
  const hoverClass = isAsk ? 'hover:bg-no/10' : 'hover:bg-yes/10'
  const priceClass = isAsk ? 'text-no' : 'text-yes'
  const widthPercent = maxTotal > 0 ? (level.total / maxTotal) * 100 : 0
  const barWidth = Math.min(100, Math.max(8, widthPercent))

  return (
    <div
      className={`
        relative grid h-9 cursor-pointer grid-cols-[40%_20%_20%_20%] items-center pr-4 pl-0 transition-colors
        ${hoverClass}
      `}
      onClick={() => onSelect?.(level)}
    >
      <div className="flex h-full items-center">
        <div className="relative h-full w-full overflow-hidden">
          <div
            className={`absolute inset-0 left-0 ${backgroundClass}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
      <div className="flex h-full items-center justify-center px-4">
        <span className={`text-sm font-medium ${priceClass}`}>
          {formatCentsLabel(level.priceCents)}
        </span>
      </div>
      <div className="flex h-full items-center justify-center px-4">
        <span className="text-sm font-medium text-foreground">
          {sharesFormatter.format(level.shares)}
        </span>
      </div>
      <div className="flex h-full items-center justify-center px-4">
        <span className="text-sm font-medium text-foreground">
          {usdFormatter.format(level.total)}
        </span>
      </div>
      {showBadge && (
        <span
          className={`
            absolute top-1/2 left-4 -translate-y-1/2 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase
            ${showBadge === 'ask' ? 'bg-no text-white' : 'bg-yes text-white'}
          `}
        >
          {showBadge === 'ask' ? 'Asks' : 'Bids'}
        </span>
      )}
    </div>
  )
}

function buildOrderBookSnapshot(
  summary: OrderBookSummaryResponse | null,
  market: Market,
  outcome: Outcome | undefined,
  lastPriceOverrideCents?: number | null,
): OrderBookSnapshot {
  const outcomeToUse = outcome ?? market.outcomes[0]
  const normalizedAsks = normalizeLevels(summary?.asks, 'ask')
  const normalizedBids = normalizeLevels(summary?.bids, 'bid')
  const maxTotal = Math.max(
    1,
    normalizedAsks.reduce((max, level) => Math.max(max, level.total), 0),
    normalizedBids.reduce((max, level) => Math.max(max, level.total), 0),
  )

  const bestAsk = normalizedAsks[0]?.priceCents
  const bestBid = normalizedBids[0]?.priceCents
  const lastPriceHistoryOverride = typeof lastPriceOverrideCents === 'number' && Number.isFinite(lastPriceOverrideCents)
    ? Math.max(0, Math.min(100, Number(lastPriceOverrideCents.toFixed(1))))
    : null
  const lastTradeOverride = toCents(summary?.last_trade_price)

  let lastPrice: number | null = lastPriceHistoryOverride ?? lastTradeOverride ?? null
  if (lastPrice === null) {
    if (typeof bestBid === 'number') {
      lastPrice = bestBid
    }
    else if (typeof bestAsk === 'number') {
      lastPrice = bestAsk
    }
  }

  const spread = typeof bestAsk === 'number' && typeof bestBid === 'number'
    ? Math.max(0, Number((bestAsk - bestBid).toFixed(1)))
    : null

  return {
    asks: normalizedAsks,
    bids: normalizedBids,
    maxTotal,
    lastPrice,
    spread,
    outcomeLabel: outcomeToUse?.outcome_index === OUTCOME_INDEX.YES ? 'Yes' : 'No',
  }
}

function normalizeLevels(levels: OrderbookLevelSummary[] | undefined, side: 'ask' | 'bid'): OrderBookLevel[] {
  if (!levels?.length) {
    return []
  }

  const parsed = levels
    .map((entry) => {
      const price = Number(entry.price)
      const size = Number(entry.size)
      if (!Number.isFinite(price) || !Number.isFinite(size) || price <= 0 || size <= 0) {
        return null
      }

      return { price, size }
    })
    .filter((entry): entry is { price: number, size: number } => entry !== null)

  const sorted = parsed
    .sort((a, b) => (side === 'ask' ? a.price - b.price : b.price - a.price))
    .slice(0, DEFAULT_MAX_LEVELS)

  let runningTotal = 0
  let runningShares = 0

  return sorted.map((entry) => {
    const displayCents = Number((entry.price * 100).toFixed(1))
    runningTotal += entry.price * entry.size
    runningShares += entry.size

    return {
      side,
      rawPrice: entry.price,
      priceCents: displayCents,
      shares: entry.size,
      cumulativeShares: runningShares,
      total: runningTotal,
    }
  })
}

function OrderBookEmptyRow({ label }: { label: string }) {
  return (
    <div className="grid h-9 grid-cols-[40%_20%_20%_20%] items-center px-4">
      <span className="col-span-4 text-center text-xs font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function formatSharesInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0'
  }

  return Number(value.toFixed(2)).toString()
}
