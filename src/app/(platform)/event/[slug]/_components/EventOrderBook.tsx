'use client'

import type { InfiniteData } from '@tanstack/react-query'
import type { Market, Outcome, UserOpenOrder } from '@/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleXIcon, Clock4Icon, Loader2Icon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { cancelOrderAction } from '@/app/(platform)/event/[slug]/_actions/cancel-order'
import { buildUserOpenOrdersQueryKey, useUserOpenOrdersQuery } from '@/app/(platform)/event/[slug]/_hooks/useUserOpenOrdersQuery'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SAFE_BALANCE_QUERY_KEY } from '@/hooks/useBalance'
import { MICRO_UNIT, ORDER_SIDE, ORDER_TYPE, OUTCOME_INDEX } from '@/lib/constants'
import { formatCentsLabel, sharesFormatter, toCents, usdFormatter } from '@/lib/formatters'
import { isTradingAuthRequiredError } from '@/lib/trading-auth/errors'
import { cn } from '@/lib/utils'
import { useTradingOnboarding } from '@/providers/TradingOnboardingProvider'
import { useOrder } from '@/stores/useOrder'
import { useUser } from '@/stores/useUser'

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
  eventSlug: string
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

interface ClobOrderbookSummary {
  asset_id: string
  bids?: OrderbookLevelSummary[]
  asks?: OrderbookLevelSummary[]
}

interface LastTradePriceEntry {
  token_id: string
  price: string
  side: 'BUY' | 'SELL'
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

interface OrderBookUserOrder {
  id: string
  priceCents: number
  totalShares: number
  filledShares: number
  side: 'ask' | 'bid'
}

const DEFAULT_MAX_LEVELS = 12
const CLOB_BASE_URL = process.env.CLOB_URL

async function fetchClobJson<T>(path: string, body: unknown): Promise<T> {
  if (!CLOB_BASE_URL) {
    throw new Error('CLOB URL is not configured.')
  }

  const endpoint = `${CLOB_BASE_URL}${path}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${text}`)
  }

  try {
    return JSON.parse(text) as T
  }
  catch (error) {
    console.error(`Failed to parse response from ${path}`, error)
    throw new Error(`Failed to parse response from ${path}`)
  }
}

async function fetchOrderBookSummaries(tokenIds: string[]): Promise<OrderBookSummariesResponse> {
  if (!tokenIds.length) {
    return {}
  }

  const payload = tokenIds.map(tokenId => ({ token_id: tokenId }))

  const [orderBooks, lastTrades] = await Promise.all([
    fetchClobJson<ClobOrderbookSummary[]>('/books', payload),
    fetchClobJson<LastTradePriceEntry[]>('/last-trades-prices', payload).catch((error) => {
      console.error('Failed to fetch last trades prices', error)
      return null
    }),
  ])

  if (!Array.isArray(orderBooks)) {
    throw new TypeError('Unexpected response format from /books')
  }

  const orderBookByToken = new Map<string, ClobOrderbookSummary>()
  orderBooks.forEach((entry) => {
    if (entry?.asset_id) {
      orderBookByToken.set(entry.asset_id, entry)
    }
  })

  const lastTradesByToken = new Map<string, LastTradePriceEntry>()
  lastTrades?.forEach((entry) => {
    if (entry?.token_id) {
      lastTradesByToken.set(entry.token_id, entry)
    }
  })

  const combined: Record<string, OrderBookSummaryResponse> = {}

  tokenIds.forEach((tokenId) => {
    const orderbookEntry = orderBookByToken.get(tokenId)
    const lastTradeEntry = lastTradesByToken.get(tokenId)

    combined[tokenId] = {
      bids: orderbookEntry?.bids ?? [],
      asks: orderbookEntry?.asks ?? [],
      last_trade_price: lastTradeEntry?.price,
      last_trade_side: lastTradeEntry?.side,
    }
  })

  return combined
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
  eventSlug,
}: EventOrderBookProps) {
  const user = useUser()
  const { openTradeRequirements } = useTradingOnboarding()
  const queryClient = useQueryClient()
  const refreshTimeoutRef = useRef<number | null>(null)
  const [pendingCancelIds, setPendingCancelIds] = useState<Set<string>>(() => new Set())
  const tokenId = outcome?.token_id || market.outcomes[0]?.token_id

  const summary = tokenId ? summaries?.[tokenId] ?? null : null
  const setType = useOrder(state => state.setType)
  const setLimitPrice = useOrder(state => state.setLimitPrice)
  const setLimitShares = useOrder(state => state.setLimitShares)
  const setAmount = useOrder(state => state.setAmount)
  const inputRef = useOrder(state => state.inputRef)
  const currentOrderType = useOrder(state => state.type)
  const currentOrderSide = useOrder(state => state.side)
  const openOrdersQueryKey = useMemo(
    () => buildUserOpenOrdersQueryKey(user?.id, eventSlug, market.condition_id),
    [eventSlug, market.condition_id, user?.id],
  )
  const { data: userOpenOrdersData } = useUserOpenOrdersQuery({
    userId: user?.id,
    eventSlug,
    conditionId: market.condition_id,
    enabled: Boolean(user?.id),
  })
  const userOpenOrders = useMemo(() => userOpenOrdersData?.pages.flat() ?? [], [userOpenOrdersData?.pages])
  const userOrdersByLevel = useMemo(() => {
    const map = new Map<string, OrderBookUserOrder>()
    userOpenOrders.forEach((order) => {
      const bookSide: 'ask' | 'bid' = order.side === 'sell' ? 'ask' : 'bid'
      const roundedPrice = getRoundedCents(order.price ?? 0, bookSide)
      const totalShares = order.side === 'buy'
        ? microToUnit(order.taker_amount)
        : microToUnit(order.maker_amount)

      if (!Number.isFinite(totalShares) || totalShares <= 0) {
        return
      }

      const filledShares = Math.min(microToUnit(order.size_matched), totalShares)
      const key = getOrderBookUserKey(bookSide, roundedPrice)
      if (map.has(key)) {
        return
      }

      map.set(key, {
        id: order.id,
        priceCents: roundedPrice,
        totalShares,
        filledShares,
        side: bookSide,
      })
    })
    return map
  }, [userOpenOrders])

  const removeOrderFromCache = useCallback((orderIds: string[]) => {
    if (!orderIds.length) {
      return
    }

    queryClient.setQueryData<InfiniteData<UserOpenOrder[]>>(openOrdersQueryKey, (current) => {
      if (!current) {
        return current
      }

      const nextPages = current.pages.map(page => page.filter(order => !orderIds.includes(order.id)))
      return { ...current, pages: nextPages }
    })
  }, [openOrdersQueryKey, queryClient])

  const scheduleOpenOrdersRefresh = useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current)
    }
    refreshTimeoutRef.current = window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: openOrdersQueryKey })
    }, 10_000)
  }, [openOrdersQueryKey, queryClient])

  const handleCancelUserOrder = useCallback(async (orderId: string) => {
    if (!orderId || pendingCancelIds.has(orderId)) {
      return
    }

    setPendingCancelIds((current) => {
      const next = new Set(current)
      next.add(orderId)
      return next
    })

    try {
      const response = await cancelOrderAction(orderId)
      if (response?.error) {
        if (isTradingAuthRequiredError(response.error)) {
          openTradeRequirements()
        }
        throw new Error(response.error)
      }

      toast.success('Order cancelled')
      removeOrderFromCache([orderId])

      await queryClient.invalidateQueries({ queryKey: openOrdersQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['orderbook-summary'] })
      void queryClient.invalidateQueries({ queryKey: [SAFE_BALANCE_QUERY_KEY] })
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: [SAFE_BALANCE_QUERY_KEY] })
      }, 3000)
      scheduleOpenOrdersRefresh()
    }
    catch (error: any) {
      const message = typeof error?.message === 'string'
        ? error.message
        : 'Failed to cancel order.'
      toast.error(message)
    }
    finally {
      setPendingCancelIds((current) => {
        const next = new Set(current)
        next.delete(orderId)
        return next
      })
    }
  }, [openOrdersQueryKey, pendingCancelIds, queryClient, removeOrderFromCache, scheduleOpenOrdersRefresh, openTradeRequirements])

  useEffect(() => () => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current)
    }
  }, [])

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
    const executablePrice = getExecutableLimitPrice(level)
    setLimitPrice(executablePrice)

    const shouldPrefillShares = (currentOrderSide === ORDER_SIDE.BUY && level.side === 'ask')
      || (currentOrderSide === ORDER_SIDE.SELL && level.side === 'bid')

    if (shouldPrefillShares) {
      const limitShares = formatSharesInput(level.cumulativeShares)
      setLimitShares(limitShares)

      const limitAmount = calculateLimitAmount(executablePrice, limitShares)
      if (limitAmount !== null) {
        setAmount(limitAmount)
      }
    }

    queueMicrotask(() => inputRef?.current?.focus())
  }, [currentOrderType, currentOrderSide, setType, setLimitPrice, setLimitShares, setAmount, inputRef])

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
    <div className="relative scrollbar-hide max-h-90 overflow-y-auto">
      <div>
        <div
          className={`
            sticky top-0 z-1 grid h-9 grid-cols-[40%_20%_20%_20%] items-center border-b border-border/60 bg-background
            px-4 text-2xs font-semibold tracking-wide text-muted-foreground uppercase
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
              renderedAsks.map((level, index) => {
                const userOrder = userOrdersByLevel.get(getOrderBookUserKey(level.side, level.priceCents))
                return (
                  <OrderBookRow
                    key={`ask-${level.priceCents}-${index}`}
                    level={level}
                    maxTotal={maxTotal}
                    showBadge={index === renderedAsks.length - 1 ? 'ask' : undefined}
                    onSelect={handleLevelSelect}
                    userOrder={userOrder}
                    isCancelling={userOrder ? pendingCancelIds.has(userOrder.id) : false}
                    onCancelUserOrder={handleCancelUserOrder}
                  />
                )
              })
            )
          : <OrderBookEmptyRow label="No asks" />}

        <div
          className={`
            sticky top-9 bottom-0 z-1 grid h-9 cursor-pointer grid-cols-[40%_20%_20%_20%] items-center border-y
            border-border/60 bg-background px-4 text-xs font-medium text-muted-foreground transition-colors
            hover:bg-muted/60
            dark:hover:bg-white/10
          `}
          role="presentation"
        >
          <div className="flex h-full cursor-pointer items-center">
            Last:&nbsp;
            {formatOrderBookPrice(lastPrice)}
          </div>
          <div className="flex h-full cursor-pointer items-center justify-center">
            Spread:&nbsp;
            {formatOrderBookPrice(spread)}
          </div>
          <div className="flex h-full items-center justify-center" />
          <div className="flex h-full items-center justify-center" />
        </div>

        {bids.length > 0
          ? (
              bids.map((level, index) => {
                const userOrder = userOrdersByLevel.get(getOrderBookUserKey(level.side, level.priceCents))
                return (
                  <OrderBookRow
                    key={`bid-${level.priceCents}-${index}`}
                    level={level}
                    maxTotal={maxTotal}
                    showBadge={index === 0 ? 'bid' : undefined}
                    onSelect={handleLevelSelect}
                    userOrder={userOrder}
                    isCancelling={userOrder ? pendingCancelIds.has(userOrder.id) : false}
                    onCancelUserOrder={handleCancelUserOrder}
                  />
                )
              })
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
  userOrder?: OrderBookUserOrder | null
  isCancelling?: boolean
  onCancelUserOrder?: (orderId: string) => void
}

function OrderBookRow({ level, maxTotal, showBadge, onSelect, userOrder, isCancelling, onCancelUserOrder }: OrderBookRowProps) {
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
        <div className="flex items-center gap-1">
          <div className="flex h-5 w-5 items-center justify-center">
            {userOrder && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      if (!isCancelling) {
                        onCancelUserOrder?.(userOrder.id)
                      }
                    }}
                    disabled={isCancelling}
                    className={cn(
                      'group inline-flex h-5 w-5 items-center justify-center text-base transition-colors',
                      userOrder.side === 'ask' ? 'text-no' : 'text-yes',
                      isCancelling && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    {isCancelling
                      ? <Loader2Icon className="size-3 animate-spin" />
                      : (
                          <>
                            <Clock4Icon className="size-3 group-hover:hidden" />
                            <CircleXIcon className="hidden size-3 group-hover:block" />
                          </>
                        )}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="left"
                  sideOffset={8}
                  hideArrow
                  className="w-48 border border-border bg-background p-3 text-xs text-foreground shadow-xl"
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Filled</span>
                    <span>
                      {formatTooltipShares(userOrder.filledShares)}
                      {' '}
                      /
                      {' '}
                      {formatTooltipShares(userOrder.totalShares)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'mt-2 h-1.5 w-full overflow-hidden rounded-full',
                      userOrder.side === 'ask' ? 'bg-no/10' : 'bg-yes/10',
                    )}
                  >
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        userOrder.side === 'ask' ? 'bg-no' : 'bg-yes',
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, (userOrder.filledShares / userOrder.totalShares) * 100))}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs font-medium text-muted-foreground">
                    {formatTooltipShares(Math.max(userOrder.totalShares - userOrder.filledShares, 0))}
                    {' '}
                    remaining
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <span className={`text-sm font-medium ${priceClass}`}>
            {formatOrderBookPrice(level.priceCents)}
          </span>
        </div>
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
            absolute top-1/2 left-4 -translate-y-1/2 rounded-sm px-1.5 py-0.5 text-2xs font-semibold uppercase
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

const MAX_LIMIT_PRICE = 99.9
const PRICE_EPSILON = 1e-8

function getExecutableLimitPrice(level: OrderBookLevel) {
  return getRoundedCents(level.rawPrice, level.side).toFixed(1)
}

function getRoundedCents(rawPrice: number, side: 'ask' | 'bid') {
  const cents = rawPrice * 100
  if (!Number.isFinite(cents)) {
    return 0
  }

  const scaled = cents * 10
  const roundedScaled = side === 'bid'
    ? Math.floor(scaled + PRICE_EPSILON)
    : Math.ceil(scaled - PRICE_EPSILON)

  const normalized = Math.max(0, Math.min(roundedScaled / 10, MAX_LIMIT_PRICE))
  return Number(normalized.toFixed(1))
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
    .map(entry => ({
      price: entry.price,
      size: Number(entry.size.toFixed(2)),
    }))
    .filter(entry => entry.size > 0)
    .slice(0, DEFAULT_MAX_LEVELS)

  let runningTotal = 0
  let runningShares = 0

  return sorted.map((entry) => {
    const displayCents = getRoundedCents(entry.price, side)
    runningTotal += entry.price * entry.size
    runningShares = Number((runningShares + entry.size).toFixed(2))

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

function getOrderBookUserKey(side: 'ask' | 'bid', priceCents: number) {
  return `${side}:${priceCents.toFixed(1)}`
}

function microToUnit(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }
  return value / MICRO_UNIT
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

function calculateLimitAmount(priceCents: string, shares: string) {
  const priceValue = Number.parseFloat(priceCents)
  const sharesValue = Number.parseFloat(shares)

  if (!Number.isFinite(priceValue) || !Number.isFinite(sharesValue)) {
    return null
  }

  const total = (priceValue * sharesValue) / 100
  if (!Number.isFinite(total) || total <= 0) {
    return null
  }

  return total.toFixed(2)
}

function formatTooltipShares(value: number) {
  if (!Number.isFinite(value)) {
    return '0'
  }
  return sharesFormatter.format(Number(value.toFixed(2)))
}

function formatOrderBookPrice(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return formatCentsLabel(null)
  }

  const normalized = value < 1 ? value / 100 : value
  return formatCentsLabel(normalized)
}
