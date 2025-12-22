'use client'

import type { UserOpenOrder } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ArrowDownNarrowWideIcon, SearchIcon, XIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface PublicOpenOrdersListProps {
  userAddress: string
}

function formatCents(price?: number) {
  return `${Math.round((price ?? 0) * 100)}¢`
}

function microToUnit(value?: number) {
  return Number.isFinite(value) ? (value ?? 0) / 1e6 : 0
}

type PublicUserOpenOrder = UserOpenOrder & {
  market: UserOpenOrder['market'] & {
    icon_url?: string
    event_slug?: string
    event_title?: string
  }
}

async function fetchOpenOrders({
  pageParam,
  signal,
}: {
  pageParam: number
  signal?: AbortSignal
}): Promise<PublicUserOpenOrder[]> {
  const params = new URLSearchParams({
    limit: '50',
    offset: pageParam.toString(),
  })

  const response = await fetch(`/api/open-orders?${params.toString()}`, { signal })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || 'Failed to load open orders')
  }
  const payload = await response.json()
  return payload.data ?? []
}

export default function PublicOpenOrdersList({ userAddress }: PublicOpenOrdersListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('market')
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const {
    status,
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PublicUserOpenOrder[]>({
    queryKey: ['public-open-orders', userAddress],
    queryFn: ({ pageParam = 0, signal }) => fetchOpenOrders({ pageParam: pageParam as number, signal }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 50) {
        return allPages.reduce((total, page) => total + page.length, 0)
      }
      return undefined
    },
    initialPageParam: 0,
    enabled: Boolean(userAddress),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  })

  const orders = useMemo(() => data?.pages.flat() ?? [], [data?.pages])

  useEffect(() => {
    if (!hasNextPage || !loadMoreRef.current) {
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry?.isIntersecting && !isFetchingNextPage) {
        void fetchNextPage()
      }
    }, { rootMargin: '200px' })

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  function renderRows() {
    return orders.map((order, index) => {
      const totalShares = order.side === 'buy'
        ? microToUnit(order.taker_amount)
        : microToUnit(order.maker_amount)
      const filledShares = microToUnit(order.size_matched)
      const totalValue = order.side === 'buy'
        ? microToUnit(order.maker_amount)
        : microToUnit(order.taker_amount)
      const filledLabel = `${filledShares.toLocaleString(undefined, { maximumFractionDigits: 3 })} / ${totalShares.toLocaleString(undefined, { maximumFractionDigits: 3 })}`
      const outcomeText = order.outcome.text || (order.outcome.index === 0 ? 'Yes' : 'No')
      const outcomeIsYes = order.outcome.index === 0
      const outcomeColor = outcomeIsYes ? 'bg-yes/15 text-yes' : 'bg-no/15 text-no'
      const priceLabel = formatCents(order.price)
      const expirationLabel = order.type === 'GTC' || !order.expiration
        ? 'Until Cancelled'
        : new Date(order.expiration * 1000).toLocaleString()
      const marketIcon = order.market.icon_url || undefined
      const eventSlug = order.market.event_slug || order.market.slug
      const isStriped = index % 2 === 0

      return (
        <div
          key={order.id}
          className={cn(
            `
              grid grid-cols-[minmax(0,2.2fr)_repeat(6,minmax(0,1fr))_auto] items-center gap-4 border-b border-border/60
              px-2 py-3 transition-colors
              hover:bg-muted/50
              sm:px-3
            `,
            'last:border-b-0',
            isStriped && 'bg-muted/40',
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            <Link
              href={`/event/${eventSlug}`}
              className="relative size-12 shrink-0 overflow-hidden rounded bg-muted"
            >
              {marketIcon
                ? (
                    <Image
                      src={marketIcon}
                      alt={order.market.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )
                : (
                    <div className="grid size-full place-items-center text-[11px] text-muted-foreground">
                      No image
                    </div>
                  )}
            </Link>
            <div className="min-w-0 space-y-1">
              <Link
                href={`/event/${eventSlug}`}
                className="line-clamp-2 block text-sm font-semibold text-foreground no-underline hover:no-underline"
                title={order.market.title}
              >
                {order.market.title}
              </Link>
            </div>
          </div>

          <div className="text-center text-sm font-semibold text-foreground">
            {order.side === 'buy' ? 'Buy' : 'Sell'}
          </div>

          <div className="text-left text-sm font-semibold">
            <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', outcomeColor)}>
              {outcomeText}
            </span>
          </div>

          <div className="text-center text-sm font-semibold text-foreground">
            {priceLabel}
          </div>

          <div className="text-center text-sm font-semibold text-foreground">
            {filledLabel}
          </div>

          <div className="text-center text-sm font-semibold text-foreground">
            {formatCurrency(totalValue)}
          </div>

          <div className="text-left text-sm text-foreground">
            {expirationLabel}
          </div>

          <div className="flex justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-lg"
                  aria-label="Cancel"
                >
                  <XIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cancel</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )
    })
  }

  const emptyText = userAddress ? 'No open orders found.' : 'Connect to view your open orders.'
  const loading = status === 'pending'

  return (
    <div className="space-y-4">
      <div className="space-y-3 px-2 pt-2 sm:px-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search open orders..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent pr-3 pl-9"
            />
          </div>

          <Select value={sortBy} onValueChange={value => setSortBy(value)}>
            <SelectTrigger className="w-48 justify-start gap-2 pr-3 [&>svg:last-of-type]:hidden">
              <ArrowDownNarrowWideIcon className="size-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="filled">Filled Quantity</SelectItem>
              <SelectItem value="total">Total Quantity</SelectItem>
              <SelectItem value="date">Order Date</SelectItem>
              <SelectItem value="resolving">Resolving Soonest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className={`
          grid grid-cols-[minmax(0,2.2fr)_repeat(6,minmax(0,1fr))_auto] items-center gap-4 px-2 pt-2 pb-3 text-xs
          font-semibold tracking-wide text-muted-foreground uppercase
          sm:px-3
        `}
      >
        <div>Market</div>
        <div className="text-center">Side</div>
        <div className="text-left sm:text-center">Outcome</div>
        <div className="text-center">Price</div>
        <div className="text-center">Filled</div>
        <div className="text-center">Total</div>
        <div className="text-left sm:text-center">Expiration</div>
        <div className="text-right"> </div>
      </div>

      {loading && (
        <div className="space-y-3 px-2 sm:px-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-14 rounded-lg border border-border/50 bg-muted/30" />
          ))}
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="space-y-0">
          {renderRows()}
          {(isFetchingNextPage) && (
            <div className="py-3 text-center text-xs text-muted-foreground">Loading more...</div>
          )}
          <div ref={loadMoreRef} className="h-0" />
        </div>
      )}
    </div>
  )
}
