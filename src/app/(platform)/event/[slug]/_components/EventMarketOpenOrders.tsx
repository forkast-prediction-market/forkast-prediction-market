'use client'

import type { InfiniteData } from '@tanstack/react-query'
import type { Event, UserOpenOrder } from '@/types'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircleIcon, ChevronDown, ChevronUp, XIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { cancelMarketOrdersAction } from '@/app/(platform)/event/[slug]/_actions/cancel-market-orders'
import { cancelOrderAction } from '@/app/(platform)/event/[slug]/_actions/cancel-order'
import { buildUserOpenOrdersQueryKey, useUserOpenOrdersQuery } from '@/app/(platform)/event/[slug]/_hooks/useUserOpenOrdersQuery'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SAFE_BALANCE_QUERY_KEY } from '@/hooks/useBalance'
import { MICRO_UNIT, OUTCOME_INDEX } from '@/lib/constants'
import { formatCurrency, formatSharePriceLabel, sharesFormatter } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useIsSingleMarket } from '@/stores/useOrder'
import { useUser } from '@/stores/useUser'

interface EventMarketOpenOrdersProps {
  market: Event['markets'][number]
  eventSlug: string
}

interface OpenOrderRowProps {
  order: UserOpenOrder
  onCancel: (order: UserOpenOrder) => void
  isCancelling: boolean
}

type SortDirection = 'asc' | 'desc'
type SortColumn = 'side' | 'outcome' | 'price' | 'filled' | 'total' | 'expiration'

const CANCEL_ICON_BUTTON_CLASS = `
  inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-transparent text-foreground
  transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
  dark:border-white/30 dark:text-white dark:hover:bg-white/10
`

function getOrderSortValue(order: UserOpenOrder, column: SortColumn) {
  switch (column) {
    case 'side':
      return order.side === 'buy' ? 0 : 1
    case 'outcome':
      return (order.outcome.text || '').toLowerCase()
    case 'price':
      return Number(order.price) || 0
    case 'filled': {
      const totalShares = microToUnit(order.side === 'buy' ? order.taker_amount : order.maker_amount)
      if (totalShares <= 0) {
        return 0
      }
      const filledShares = microToUnit(order.size_matched)
      return Math.min(filledShares / totalShares, 1)
    }
    case 'total': {
      const totalValueMicro = order.side === 'buy' ? order.maker_amount : order.taker_amount
      return microToUnit(totalValueMicro)
    }
    case 'expiration': {
      if (order.type === 'GTC') {
        return Number.POSITIVE_INFINITY
      }
      const rawExpiration = typeof order.expiration === 'number'
        ? order.expiration
        : Number(order.expiration)
      return Number.isFinite(rawExpiration) ? rawExpiration : Number.POSITIVE_INFINITY
    }
    default:
      return 0
  }
}

function sortOrders(orders: UserOpenOrder[], sortState: { column: SortColumn, direction: SortDirection } | null) {
  if (!sortState) {
    return orders
  }

  const sorted = [...orders]
  sorted.sort((a, b) => {
    const aValue = getOrderSortValue(a, sortState.column)
    const bValue = getOrderSortValue(b, sortState.column)

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue)
      return sortState.direction === 'asc' ? comparison : -comparison
    }

    const numericComparison = Number(aValue) - Number(bValue)
    if (numericComparison === 0) {
      return 0
    }

    return sortState.direction === 'asc' ? numericComparison : -numericComparison
  })

  return sorted
}

function SortHeaderButton({
  column,
  label,
  alignment = 'left',
  sortState,
  onSort,
}: {
  column: SortColumn
  label: string
  alignment?: 'left' | 'center' | 'right'
  sortState: { column: SortColumn, direction: SortDirection } | null
  onSort: (column: SortColumn) => void
}) {
  const isActive = sortState?.column === column
  const direction = isActive ? sortState?.direction : null
  const Icon = direction === 'asc' ? ChevronUp : ChevronDown

  return (
    <button
      type="button"
      className={cn(
        `
          group flex w-full items-center gap-2 text-2xs font-semibold tracking-wide whitespace-nowrap
          text-muted-foreground uppercase transition-colors
        `,
        alignment === 'center' && 'justify-center',
        alignment === 'right' && 'justify-end',
        alignment === 'left' && 'justify-start',
      )}
      onClick={() => onSort(column)}
    >
      <span>{label}</span>
      <Icon
        className={cn(
          'size-3.5 shrink-0 transition-colors',
          isActive ? 'text-foreground' : 'text-muted-foreground/60',
        )}
      />
    </button>
  )
}

function microToUnit(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0
  }
  return value / MICRO_UNIT
}

function formatExpirationLabel(order: UserOpenOrder) {
  if (order.type === 'GTC') {
    return 'Until Cancelled'
  }

  const rawExpiration = typeof order.expiration === 'number'
    ? order.expiration
    : Number(order.expiration)

  if (!Number.isFinite(rawExpiration) || rawExpiration <= 0) {
    return '—'
  }

  const date = new Date(rawExpiration * 1000)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFilledLabel(filledShares: number, totalShares: number) {
  if (!Number.isFinite(totalShares) || totalShares <= 0) {
    return '—'
  }

  const normalizedFilled = Math.min(Math.max(filledShares, 0), totalShares)
  return `${sharesFormatter.format(normalizedFilled)}/${sharesFormatter.format(totalShares)}`
}

function OpenOrderRow({ order, onCancel, isCancelling }: OpenOrderRowProps) {
  const isBuy = order.side === 'buy'
  const sideLabel = isBuy ? 'Buy' : 'Sell'
  const priceLabel = formatSharePriceLabel(order.price, { fallback: '—' })
  const totalShares = microToUnit(isBuy ? order.taker_amount : order.maker_amount)
  const filledShares = microToUnit(order.size_matched)
  const filledLabel = formatFilledLabel(filledShares, totalShares)
  const totalValueMicro = isBuy ? order.maker_amount : order.taker_amount
  const totalValueLabel = formatCurrency(microToUnit(totalValueMicro), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const expirationLabel = formatExpirationLabel(order)
  const isNoOutcome = order.outcome.index === OUTCOME_INDEX.NO
  const outcomeLabel = order.outcome.text || (isNoOutcome ? 'No' : 'Yes')

  return (
    <tr className="text-2xs leading-tight text-foreground sm:text-xs">
      <td className="px-2 py-1.5 text-xs font-semibold text-muted-foreground sm:px-3 sm:text-sm">
        {sideLabel}
      </td>
      <td className="px-2 py-1.5 sm:px-3">
        <span
          className={cn(
            `
              inline-flex min-h-7 min-w-14 items-center justify-center rounded-sm px-4 text-xs font-semibold
              tracking-wide
            `,
            isNoOutcome ? 'bg-no/15 text-no-foreground' : 'bg-yes/15 text-yes-foreground',
          )}
        >
          {outcomeLabel}
        </span>
      </td>
      <td className="px-2 py-1.5 text-center text-xs font-semibold sm:px-3 sm:text-sm">{priceLabel}</td>
      <td className="px-2 py-1.5 text-center text-xs font-semibold sm:px-3 sm:text-sm">{filledLabel}</td>
      <td className="px-2 py-1.5 text-center text-xs font-semibold sm:px-3 sm:text-sm">{totalValueLabel}</td>
      <td className="px-2 py-1.5 text-2xs font-medium text-muted-foreground sm:px-3 sm:text-xs">
        {expirationLabel}
      </td>
      <td className="px-2 py-1.5 sm:px-3">
        <div className="flex justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Cancel ${sideLabel} order for ${outcomeLabel}`}
                className={cn(CANCEL_ICON_BUTTON_CLASS, isCancelling && 'cursor-not-allowed opacity-60')}
                disabled={isCancelling}
                onClick={() => onCancel(order)}
              >
                <XIcon className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="border border-border bg-background text-foreground" hideArrow>
              Cancel order
            </TooltipContent>
          </Tooltip>
        </div>
      </td>
    </tr>
  )
}

export default function EventMarketOpenOrders({ market, eventSlug }: EventMarketOpenOrdersProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const user = useUser()
  const queryClient = useQueryClient()
  const isSingleMarket = useIsSingleMarket()
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const [pendingCancelIds, setPendingCancelIds] = useState<Set<string>>(() => new Set())
  const [isCancellingAll, setIsCancellingAll] = useState(false)
  const [sortState, setSortState] = useState<{ column: SortColumn, direction: SortDirection } | null>(null)

  useEffect(() => {
    queueMicrotask(() => {
      setInfiniteScrollError(null)
    })
  }, [market.condition_id, eventSlug])

  const openOrdersQueryKey = useMemo(
    () => buildUserOpenOrdersQueryKey(user?.id, eventSlug, market.condition_id),
    [eventSlug, market.condition_id, user?.id],
  )

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useUserOpenOrdersQuery({
    userId: user?.id,
    eventSlug,
    conditionId: market.condition_id,
  })

  const orders = useMemo(() => data?.pages.flat() ?? [], [data?.pages])
  const sortedOrders = useMemo(() => sortOrders(orders, sortState), [orders, sortState])
  const hasOrders = sortedOrders.length > 0

  const removeOrdersFromCache = useCallback((orderIds: string[]) => {
    if (!orderIds.length) {
      return
    }

    queryClient.setQueryData<InfiniteData<UserOpenOrder[]>>(openOrdersQueryKey, (current) => {
      if (!current) {
        return current
      }

      const updatedPages = current.pages.map(page => page.filter(item => !orderIds.includes(item.id)))
      return { ...current, pages: updatedPages }
    })
  }, [openOrdersQueryKey, queryClient])

  const scheduleOpenOrdersRefresh = useCallback(() => {
    setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: openOrdersQueryKey })
    }, 10_000)
  }, [openOrdersQueryKey, queryClient])

  const handleCancelOrder = useCallback(async (order: UserOpenOrder) => {
    if (pendingCancelIds.has(order.id)) {
      return
    }

    setPendingCancelIds((current) => {
      const next = new Set(current)
      next.add(order.id)
      return next
    })

    try {
      const response = await cancelOrderAction(order.id)
      if (response?.error) {
        throw new Error(response.error)
      }

      toast.success('Order cancelled')

      removeOrdersFromCache([order.id])
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
        next.delete(order.id)
        return next
      })
    }
  }, [openOrdersQueryKey, pendingCancelIds, queryClient, removeOrdersFromCache, scheduleOpenOrdersRefresh])

  const handleSort = useCallback((column: SortColumn) => {
    setSortState((current) => {
      if (current?.column === column) {
        return {
          column,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      return { column, direction: 'desc' }
    })
  }, [])

  const handleCancelAll = useCallback(async () => {
    if (!sortedOrders.length || isCancellingAll) {
      return
    }

    const orderIds = sortedOrders.map(order => order.id)
    setIsCancellingAll(true)
    setPendingCancelIds((current) => {
      const next = new Set(current)
      orderIds.forEach(id => next.add(id))
      return next
    })

    try {
      const result = await cancelMarketOrdersAction({ market: market.condition_id })
      if (result.error) {
        throw new Error(result.error)
      }

      const failedIds = Object.keys(result.notCanceled ?? {})
      const failedCount = failedIds.length

      if (failedCount === 0) {
        toast.success('All open orders for this market were cancelled.')
      }
      else {
        toast.error(`Could not cancel ${failedCount} order${failedCount > 1 ? 's' : ''}.`)
      }

      if (result.cancelled.length) {
        removeOrdersFromCache(result.cancelled)
      }
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
        : 'Failed to cancel open orders.'
      toast.error(message)
    }
    finally {
      setPendingCancelIds((current) => {
        const next = new Set(current)
        orderIds.forEach(id => next.delete(id))
        return next
      })
      setIsCancellingAll(false)
    }
  }, [
    isCancellingAll,
    market.condition_id,
    openOrdersQueryKey,
    queryClient,
    removeOrdersFromCache,
    scheduleOpenOrdersRefresh,
    sortedOrders,
  ])

  useEffect(() => {
    if (!hasOrders || typeof window === 'undefined') {
      return
    }

    const intervalId = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: openOrdersQueryKey })
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [hasOrders, openOrdersQueryKey, queryClient])

  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage || status === 'pending') {
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) {
        return
      }
      if (isFetchingNextPage || infiniteScrollError) {
        return
      }

      fetchNextPage().catch((error: any) => {
        if (error?.name === 'CanceledError' || error?.name === 'AbortError') {
          return
        }
        setInfiniteScrollError(error?.message || 'Failed to load more open orders')
      })
    }, { rootMargin: '200px 0px' })

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, infiniteScrollError, isFetchingNextPage, status])

  const shouldRender = Boolean(user?.id && status === 'success' && hasOrders)

  if (!shouldRender) {
    return null
  }

  const content = (
    <>
      {isSingleMarket && (
        <div className="p-4">
          <h3 className="text-lg font-semibold">Open Orders</h3>
        </div>
      )}

      <div className="max-w-full min-w-0 overflow-x-auto px-2">
        <table className="w-full max-w-full table-fixed border-collapse max-sm:min-w-[140%] sm:min-w-full">
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr
              className={`
                border-b border-border/60 bg-background text-2xs font-semibold tracking-wide text-muted-foreground
                uppercase
              `}
            >
              <th className="px-2 py-3 text-left sm:px-3">
                <SortHeaderButton column="side" label="Side" sortState={sortState} onSort={handleSort} />
              </th>
              <th className="px-2 py-3 text-left sm:px-3">
                <SortHeaderButton column="outcome" label="Outcome" sortState={sortState} onSort={handleSort} />
              </th>
              <th className="px-2 py-3 text-center sm:px-3">
                <SortHeaderButton column="price" label="Price" alignment="center" sortState={sortState} onSort={handleSort} />
              </th>
              <th className="px-2 py-3 text-center sm:px-3">
                <SortHeaderButton column="filled" label="Filled" alignment="center" sortState={sortState} onSort={handleSort} />
              </th>
              <th className="px-2 py-3 text-center sm:px-3">
                <SortHeaderButton column="total" label="Total" alignment="center" sortState={sortState} onSort={handleSort} />
              </th>
              <th className="px-2 py-3 text-left sm:px-3">
                <SortHeaderButton column="expiration" label="Expiration" sortState={sortState} onSort={handleSort} />
              </th>
              <th className="px-2 py-3 text-right sm:px-3">
                <button
                  type="button"
                  className={`
                    text-2xs font-semibold tracking-wide whitespace-nowrap text-destructive uppercase transition-opacity
                    disabled:opacity-40
                  `}
                  onClick={handleCancelAll}
                  disabled={isCancellingAll || !hasOrders}
                >
                  {isCancellingAll ? 'Cancelling…' : 'Cancel All'}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sortedOrders.map(order => (
              <OpenOrderRow
                key={order.id}
                order={order}
                onCancel={handleCancelOrder}
                isCancelling={pendingCancelIds.has(order.id)}
              />
            ))}
          </tbody>
        </table>
        {hasNextPage && !infiniteScrollError && (
          <div ref={sentinelRef} className="h-1" />
        )}
      </div>

      {hasOrders && isFetchingNextPage && (
        <div className={cn(isSingleMarket ? 'border-t border-border/60' : '', `
          px-4 py-3 text-center text-xs text-muted-foreground
        `)}
        >
          Loading more open orders...
        </div>
      )}

      {infiniteScrollError && (
        <div className={cn(isSingleMarket ? 'border-t border-border/60' : '', 'px-4 py-3')}>
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Could not load more open orders</AlertTitle>
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
    </>
  )

  return isSingleMarket
    ? (
        <section className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-background/80">
          {content}
        </section>
      )
    : (
        <div className="min-w-0">
          {content}
        </div>
      )
}
