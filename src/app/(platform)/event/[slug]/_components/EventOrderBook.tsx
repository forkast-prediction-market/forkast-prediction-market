'use client'

import type { InfiniteData } from '@tanstack/react-query'
import type { EventOrderBookProps, OrderBookLevel, OrderBookUserOrder } from '@/app/(platform)/event/[slug]/_types/EventOrderBookTypes'
import type { UserOpenOrder } from '@/types'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { cancelOrderAction } from '@/app/(platform)/event/[slug]/_actions/cancel-order'
import { buildUserOpenOrdersQueryKey, useUserOpenOrdersQuery } from '@/app/(platform)/event/[slug]/_hooks/useUserOpenOrdersQuery'
import { SAFE_BALANCE_QUERY_KEY } from '@/hooks/useBalance'
import { ORDER_SIDE, ORDER_TYPE } from '@/lib/constants'
import { isTradingAuthRequiredError } from '@/lib/trading-auth/errors'
import { useTradingOnboarding } from '@/providers/TradingOnboardingProvider'
import { useOrder } from '@/stores/useOrder'
import { useUser } from '@/stores/useUser'
import { useOrderBookSummaries } from '../_hooks/useOrderBookSummaries'
import {
  buildOrderBookSnapshot,
  calculateLimitAmount,
  formatOrderBookPrice,
  formatSharesInput,
  getExecutableLimitPrice,
  getOrderBookUserKey,
  getRoundedCents,
  microToUnit,
} from '../_utils/EventOrderBookUtils'
import EventOrderBookEmptyRow from './EventOrderBookEmptyRow'
import EventOrderBookRow from './EventOrderBookRow'

export { useOrderBookSummaries }

export default function EventOrderBook({
  market,
  outcome,
  summaries,
  isLoadingSummaries,
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
  const userOpenOrders = useMemo(
    () => userOpenOrdersData?.pages.flatMap(page => page.data) ?? [],
    [userOpenOrdersData?.pages],
  )
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
    () => buildOrderBookSnapshot(summary, market, outcome),
    [summary, market, outcome],
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
          className={
            `
              sticky top-0 z-1 grid h-9 grid-cols-[40%_20%_20%_20%] items-center border-b border-border/60 bg-background
              px-4 text-2xs font-semibold tracking-wide text-muted-foreground uppercase
            `
          }
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
                  <EventOrderBookRow
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
          : <EventOrderBookEmptyRow label="No asks" />}

        <div
          className={
            `
              sticky top-9 bottom-0 z-1 grid h-9 cursor-pointer grid-cols-[40%_20%_20%_20%] items-center border-y
              border-border/60 bg-background px-4 text-xs font-medium text-muted-foreground transition-colors
              hover:bg-muted/60
              dark:hover:bg-white/10
            `
          }
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
                  <EventOrderBookRow
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
          : <EventOrderBookEmptyRow label="No bids" />}
      </div>
    </div>
  )
}
