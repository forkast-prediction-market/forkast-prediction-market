'use client'

import type { DataApiActivity } from '@/lib/data-api/user'
import type { ActivityOrder } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  ArrowDownNarrowWideIcon,
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  CircleDollarSignIcon,
  CircleMinusIcon,
  CirclePlusIcon,
  DownloadIcon,
  ListFilterIcon,
  MergeIcon,
  SearchIcon,
  UnfoldHorizontalIcon,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MICRO_UNIT } from '@/lib/constants'
import { mapDataApiActivityToActivityOrder } from '@/lib/data-api/user'
import { formatCurrency, formatTimeAgo } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface PublicHistoryListProps {
  userAddress: string
}

type HistoryTypeFilter = 'all' | 'trades' | 'buy' | 'merge' | 'redeem'
type HistorySort = 'newest' | 'oldest' | 'value' | 'shares'

const DATA_API_URL = process.env.DATA_URL!

async function fetchUserHistory({
  pageParam,
  userAddress,
  signal,
}: {
  pageParam: number
  userAddress: string
  signal?: AbortSignal
}): Promise<ActivityOrder[]> {
  const params = new URLSearchParams({
    user: userAddress,
    limit: '100',
    offset: pageParam.toString(),
    sortBy: 'TIMESTAMP',
    sortDirection: 'DESC',
  })

  const response = await fetch(`${DATA_API_URL}/activity?${params.toString()}`, { signal })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const errorMessage = errorBody?.error || 'Failed to load activity.'
    throw new Error(errorMessage)
  }

  const result = await response.json()
  if (!Array.isArray(result)) {
    throw new TypeError('Unexpected response from data service.')
  }

  return (result as DataApiActivity[]).map(mapDataApiActivityToActivityOrder)
}

function formatShares(amount: string | number | undefined) {
  if (amount == null) {
    return null
  }
  const numeric = Number(amount) / MICRO_UNIT
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null
  }
  return `${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${numeric === 1 ? 'share' : 'shares'}`
}

function formatPriceCents(price?: string | number) {
  const numeric = Number(price)
  if (!Number.isFinite(numeric)) {
    return null
  }
  return `${Math.round(numeric * 100)}¢`
}

type ActivityVariant = 'split' | 'merge' | 'deposit' | 'withdraw' | 'sell' | 'buy' | 'trade'

function resolveVariant(activity: ActivityOrder): ActivityVariant {
  const type = activity.type?.toLowerCase()
  if (type === 'split') {
    return 'split'
  }
  if (type === 'merge' || type === 'merged') {
    return 'merge'
  }
  if (type === 'deposit' || type === 'deposit_funds') {
    return 'deposit'
  }
  if (type === 'withdraw' || type === 'withdraw_funds') {
    return 'withdraw'
  }
  if (type === 'sell') {
    return 'sell'
  }
  if (type === 'buy') {
    return 'buy'
  }
  if (activity.side === 'sell') {
    return 'sell'
  }
  if (activity.side === 'buy') {
    return 'buy'
  }
  return 'trade'
}

function activityIcon(variant: ActivityVariant) {
  switch (variant) {
    case 'split':
      return { Icon: UnfoldHorizontalIcon, label: 'Split', className: '' }
    case 'merge':
      return { Icon: MergeIcon, label: 'Merged', className: 'rotate-90' }
    case 'deposit':
      return { Icon: ArrowDownToLineIcon, label: 'Deposited', className: '' }
    case 'withdraw':
      return { Icon: ArrowUpToLineIcon, label: 'Withdrew', className: '' }
    case 'sell':
      return { Icon: CircleMinusIcon, label: 'Sold', className: '' }
    case 'buy':
      return { Icon: CirclePlusIcon, label: 'Bought', className: '' }
    default:
      return { Icon: CirclePlusIcon, label: 'Trade', className: '' }
  }
}

function formatCsvNumber(value: number) {
  if (!Number.isFinite(value)) {
    return ''
  }
  return value.toFixed(6).replace(/\.?0+$/, '')
}

function formatCsvValue(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

function formatExportFilename(siteName: string, date: Date) {
  const weekday = WEEKDAY_LABELS[date.getDay()] ?? 'Sun'
  const month = MONTH_LABELS[date.getMonth()] ?? 'Jan'
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  const rawOffsetMinutes = date.getTimezoneOffset()
  const offsetMinutes = Math.abs(rawOffsetMinutes)
  const offsetHours = String(Math.floor(offsetMinutes / 60)).padStart(2, '0')
  const offsetRemainder = String(offsetMinutes % 60).padStart(2, '0')
  const offsetSign = rawOffsetMinutes <= 0 ? '+' : '-'
  return `${siteName}_Transaction_History_${weekday}_${month}_${day}_${year}_${hour}_${minute}_${second}_GMT_${offsetSign}${offsetHours}${offsetRemainder}.csv`
}

export default function PublicHistoryList({ userAddress }: PublicHistoryListProps) {
  const rowGridClass = 'grid grid-cols-[minmax(9rem,auto)_minmax(0,2.6fr)_minmax(0,1fr)_auto] items-center gap-3'
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>('all')
  const [sortFilter, setSortFilter] = useState<HistorySort>('newest')
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const {
    status,
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<ActivityOrder[]>({
    queryKey: ['user-history', userAddress],
    queryFn: ({ pageParam = 0, signal }) => fetchUserHistory({
      pageParam: pageParam as number,
      userAddress,
      signal,
    }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 100) {
        return allPages.reduce((total, page) => total + page.length, 0)
      }
      return undefined
    },
    initialPageParam: 0,
    enabled: Boolean(userAddress),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  })

  const activities = useMemo(
    () => data?.pages.flat() ?? [],
    [data?.pages],
  )
  const visibleActivities = activities

  const isLoading = status === 'pending'
  const hasError = status === 'error'
  const hasNoData = !isLoading && activities.length === 0

  function handleExportCsv() {
    if (visibleActivities.length === 0) {
      return
    }

    const headers = [
      'marketName',
      'action',
      'usdcAmount',
      'tokenAmount',
      'tokenName',
      'timestamp',
      'hash',
    ]

    const rows = visibleActivities.map((activity) => {
      const variant = resolveVariant(activity)
      const action = variant.charAt(0).toUpperCase() + variant.slice(1)
      const marketName = variant === 'deposit'
        ? 'Deposited funds'
        : variant === 'withdraw'
          ? 'Withdrew funds'
          : activity.market.title
      const usdcAmount = formatCsvNumber(Math.abs(Number(activity.total_value)) / MICRO_UNIT)
      const tokenAmount = (variant === 'deposit' || variant === 'withdraw')
        ? ''
        : formatCsvNumber(Math.abs(Number(activity.amount)) / MICRO_UNIT)
      const tokenName = (variant === 'buy' || variant === 'sell' || variant === 'trade')
        ? (activity.outcome?.text ?? '')
        : ''
      const timestampMs = activity.created_at ? new Date(activity.created_at).getTime() : Number.NaN
      const timestamp = Number.isFinite(timestampMs)
        ? Math.floor(timestampMs / 1000).toString()
        : ''
      const hash = activity.tx_hash ?? ''

      return [marketName, action, usdcAmount, tokenAmount, tokenName, timestamp, hash]
    })

    const csvContent = [
      headers.map(formatCsvValue).join(','),
      ...rows.map(row => row.map(formatCsvValue).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const siteName = process.env.NEXT_PUBLIC_SITE_NAME!
    link.download = formatExportFilename(siteName, new Date())
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!hasNextPage || !loadMoreRef.current) {
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry?.isIntersecting && !isFetchingNextPage && !isLoadingMore && !infiniteScrollError) {
        setIsLoadingMore(true)
        fetchNextPage()
          .then(() => {
            setIsLoadingMore(false)
            setInfiniteScrollError(null)
          })
          .catch((error) => {
            setIsLoadingMore(false)
            if (error.name !== 'AbortError') {
              setInfiniteScrollError(error.message || 'Failed to load more activity.')
            }
          })
      }
    }, { rootMargin: '200px' })

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, infiniteScrollError, isFetchingNextPage, isLoadingMore])

  function renderRows() {
    return activities.map((activity) => {
      const variant = resolveVariant(activity)
      const { Icon, label, className } = activityIcon(variant)
      const sharesText = formatShares(activity.amount)
      const priceText = formatPriceCents(activity.price)
      const eventSlug = activity.market.event?.slug || activity.market.slug
      const outcomeText = activity.outcome?.text || 'Outcome'
      const outcomeIsYes = outcomeText.toLowerCase().includes('yes') || activity.outcome?.index === 0
      const outcomeColor = outcomeIsYes ? 'bg-yes/15 text-yes' : 'bg-no/15 text-no'
      const imageUrl = activity.market.icon_url
        ? (
            activity.market.icon_url.startsWith('http')
              ? activity.market.icon_url
              : `https://gateway.irys.xyz/${activity.market.icon_url}`
          )
        : null
      const isFundsFlow = variant === 'deposit' || variant === 'withdraw'
      const valueNumber = Number(activity.total_value) / MICRO_UNIT
      const hasValue = Number.isFinite(valueNumber)
      const isCreditVariant = variant === 'merge' || variant === 'deposit' || variant === 'sell'
      const isDebitVariant = variant === 'withdraw' || variant === 'split' || variant === 'buy'
      const isPositive = isCreditVariant || (!isDebitVariant && hasValue && valueNumber > 0)
      const isNegative = isDebitVariant || (!isCreditVariant && hasValue && valueNumber < 0)
      const valueDisplay = hasValue ? formatCurrency(Math.abs(valueNumber)) : '—'
      const valuePrefix = hasValue ? (isNegative ? '-' : '+') : ''
      const marketContent = isFundsFlow
        ? (
            <div className="flex min-w-0 items-center gap-2.5 pl-1">
              <div className={`
                grid size-12 shrink-0 place-items-center overflow-hidden rounded bg-primary/10 text-primary
              `}
              >
                <CircleDollarSignIcon className="size-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="block max-w-[64ch] truncate text-sm leading-tight font-semibold text-foreground">
                  {variant === 'deposit' ? 'Deposited funds' : 'Withdrew funds'}
                </div>
              </div>
            </div>
          )
        : (
            <div className="flex min-w-0 items-start gap-2.5 pl-1">
              <Link
                href={`/event/${eventSlug}`}
                className="relative size-12 shrink-0 overflow-hidden rounded bg-muted"
              >
                {imageUrl
                  ? (
                      <Image
                        src={imageUrl}
                        alt={activity.market.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    )
                  : (
                      <div className="grid size-full place-items-center text-2xs text-muted-foreground">
                        No image
                      </div>
                    )}
              </Link>

              <div className="min-w-0 space-y-1">
                <Link
                  href={`/event/${eventSlug}`}
                  className={`
                    block max-w-[64ch] truncate text-sm leading-tight font-semibold text-foreground no-underline
                    hover:no-underline
                  `}
                  title={activity.market.title}
                >
                  {activity.market.title}
                </Link>
                <div className="flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
                  {(variant === 'buy' || variant === 'sell') && (
                    <span className={cn(`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-2xs font-semibold`, outcomeColor)}>
                      {outcomeText}
                      {' '}
                      {priceText}
                    </span>
                  )}
                  {sharesText && <span>{sharesText}</span>}
                </div>
              </div>
            </div>
          )

      return (
        <div
          key={activity.id}
          className={cn(
            rowGridClass,
            `
              border-b border-border/60 px-2 py-2 transition-colors
              first:border-t first:border-border/60
              hover:bg-muted/50
              sm:px-3
            `,
            'last:border-b-0',
          )}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon className={cn('size-4 text-muted-foreground', className)} />
            <span>{label}</span>
          </div>

          {marketContent}

          <div className={cn('text-right text-sm font-semibold', isPositive ? 'text-yes' : 'text-foreground')}>
            {Number.isFinite(valueNumber) ? `${valuePrefix}${valueDisplay}` : '—'}
          </div>

          <div className="text-right text-xs text-muted-foreground">
            {formatTimeAgo(activity.created_at)}
          </div>
        </div>
      )
    })
  }

  return (
    <div className="space-y-3 pb-0">
      <div className="space-y-3 px-2 pt-2 sm:px-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search activity..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-3 pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <Select value={typeFilter} onValueChange={value => setTypeFilter(value as HistoryTypeFilter)}>
              <SelectTrigger className="w-28 justify-start gap-2 [&>svg:last-of-type]:hidden">
                <ListFilterIcon className="size-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="trades">Trades</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="merge">Merge</SelectItem>
                <SelectItem value="redeem">Redeem</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortFilter} onValueChange={value => setSortFilter(value as HistorySort)}>
              <SelectTrigger className="w-32 justify-start gap-2 pr-3 [&>svg:last-of-type]:hidden">
                <ArrowDownNarrowWideIcon className="size-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="value">Value</SelectItem>
                <SelectItem value="shares">Shares</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-lg"
              onClick={handleExportCsv}
              disabled={visibleActivities.length === 0}
            >
              <DownloadIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-180">
          <div
            className={cn(
              rowGridClass,
              `px-2 pt-2 pb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:px-3`,
            )}
          >
            <div>Activity</div>
            <div>Market</div>
            <div className="text-right">Value</div>
            <div className="text-right text-transparent" aria-hidden>
              <span className="invisible">Time</span>
            </div>
          </div>

          {isLoading && (
            <div className="space-y-3 px-2 sm:px-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-14 rounded-lg border border-border/50 bg-muted/30"
                />
              ))}
            </div>
          )}

          {hasError && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Could not load activity.
              {' '}
              <button
                type="button"
                onClick={() => refetch()}
                className="underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          )}

          {hasNoData && !hasError && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No history found.
            </div>
          )}

          {!isLoading && !hasError && activities.length > 0 && (
            <div>
              {renderRows()}
              {(isFetchingNextPage || isLoadingMore) && (
                <div className="py-3 text-center text-xs text-muted-foreground">Loading more...</div>
              )}
              <div ref={loadMoreRef} />
              {infiniteScrollError && (
                <div className="py-3 text-center text-xs text-no">
                  {infiniteScrollError}
                  {' '}
                  <button
                    type="button"
                    onClick={() => {
                      setInfiniteScrollError(null)
                      void fetchNextPage()
                    }}
                    className="underline underline-offset-2"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
