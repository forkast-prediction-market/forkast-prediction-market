'use client'

import type { MergeableMarket } from './MergePositionsDialog'
import type { PublicPosition } from './PublicPositionItem'
import type { SafeTransactionRequestPayload } from '@/lib/safe/transactions'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownNarrowWideIcon,
  ArrowRightIcon,
  CopyIcon,
  Loader2Icon,
  MergeIcon,
  SearchIcon,
  ShareIcon,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { hashTypedData } from 'viem'
import { useSignMessage } from 'wagmi'
import { getSafeNonceAction, submitSafeTransactionAction } from '@/app/(platform)/_actions/approve-tokens'
import { fetchUserOpenOrders } from '@/app/(platform)/event/[slug]/_hooks/useUserOpenOrdersQuery'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SAFE_BALANCE_QUERY_KEY } from '@/hooks/useBalance'
import { useDebounce } from '@/hooks/useDebounce'
import { useIsMobile } from '@/hooks/useIsMobile'
import { defaultNetwork } from '@/lib/appkit'
import { DEFAULT_CONDITION_PARTITION, DEFAULT_ERROR_MESSAGE, MICRO_UNIT, OUTCOME_INDEX } from '@/lib/constants'
import { ZERO_COLLECTION_ID } from '@/lib/contracts'
import { formatCentsLabel, formatCurrency, formatPercent, toMicro } from '@/lib/formatters'
import { aggregateSafeTransactions, buildMergePositionTransaction, getSafeTxTypedData, packSafeSignature } from '@/lib/safe/transactions'

import { cn } from '@/lib/utils'
import { useTradingOnboarding } from '@/providers/TradingOnboardingProvider'
import { useUser } from '@/stores/useUser'
import { MergePositionsDialog } from './MergePositionsDialog'
import PublicPositionsError from './PublicPositionsError'
import PublicPositionsLoadingState from './PublicPositionsLoadingState'

type SortOption
  = | 'currentValue'
    | 'trade'
    | 'pnlPercent'
    | 'pnlValue'
    | 'shares'
    | 'alpha'
    | 'endingSoon'
    | 'payout'
    | 'latestPrice'
    | 'avgCost'

type ShareCardVariant = 'yes' | 'no'

interface ShareCardPayload {
  title: string
  outcome: string
  avgPrice: string
  odds: string
  cost: string
  invested: string
  toWin: string
  imageUrl?: string
  userName?: string
  userImage?: string
  variant: ShareCardVariant
  eventSlug: string
}

function formatCurrencyValue(value?: number) {
  return Number.isFinite(value) ? formatCurrency(value ?? 0) : '—'
}

function getOutcomeLabel(position: PublicPosition) {
  if (position.outcome && position.outcome.trim()) {
    return position.outcome
  }
  return position.outcomeIndex === OUTCOME_INDEX.NO ? 'No' : 'Yes'
}

function getOutcomeVariant(position: PublicPosition): ShareCardVariant {
  if (position.outcomeIndex === OUTCOME_INDEX.NO) {
    return 'no'
  }
  const label = getOutcomeLabel(position).toLowerCase()
  return label.includes('no') ? 'no' : 'yes'
}

function buildShareCardPayload(position: PublicPosition): ShareCardPayload {
  const avgPrice = position.avgPrice ?? 0
  const shares = position.size ?? 0
  const tradeValue = shares * avgPrice
  const toWinValue = shares
  const nowPrice = Number.isFinite(position.curPrice) && position.curPrice !== undefined
    ? position.curPrice!
    : avgPrice
  const outcome = getOutcomeLabel(position)
  const imageUrl = position.icon ? `https://gateway.irys.xyz/${position.icon}` : undefined

  return {
    title: position.title || 'Untitled market',
    outcome,
    avgPrice: formatCentsLabel(avgPrice, { fallback: '—' }),
    odds: formatPercent(nowPrice * 100, { digits: 0 }),
    cost: formatCurrencyValue(tradeValue),
    invested: formatCurrencyValue(tradeValue),
    toWin: formatCurrencyValue(toWinValue),
    imageUrl,
    variant: getOutcomeVariant(position),
    eventSlug: position.eventSlug || position.slug,
  }
}

function buildShareCardUrl(payload: ShareCardPayload) {
  const encodedPayload = encodeSharePayload(payload)
  const params = new URLSearchParams({
    position: encodedPayload,
  })
  return `/api/og?${params.toString()}`
}

function encodeSharePayload(payload: ShareCardPayload) {
  const json = JSON.stringify(payload)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function getTradeValue(position: PublicPosition) {
  return (position.size ?? 0) * (position.avgPrice ?? 0)
}

function getValue(position: PublicPosition) {
  return position.currentValue ?? 0
}

function getPnlValue(position: PublicPosition) {
  return getValue(position) - getTradeValue(position)
}

function getPnlPercent(position: PublicPosition) {
  const trade = getTradeValue(position)
  return trade > 0 ? (getPnlValue(position) / trade) * 100 : 0
}

interface PositionsFilterControlsProps {
  searchQuery: string
  sortBy: SortOption
  handleSearchChange: (query: string) => void
  handleSortChange: (value: SortOption) => void
  showMergeButton: boolean
  onMergeClick: () => void
}

function PositionsFilterControls({
  searchQuery,
  sortBy,
  handleSearchChange,
  handleSortChange,
  showMergeButton,
  onMergeClick,
}: PositionsFilterControlsProps) {
  return (
    <div className="space-y-3 px-2 pt-2 sm:px-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onClick={() => handleSearchChange('')}
            className="w-full pr-3 pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={value => handleSortChange(value as SortOption)}>
            <SelectTrigger className="w-48 justify-start gap-2 pr-3 [&>svg:last-of-type]:hidden">
              <ArrowDownNarrowWideIcon className="size-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="currentValue">Current value</SelectItem>
              <SelectItem value="trade">Trade</SelectItem>
              <SelectItem value="pnlPercent">Profit &amp; Loss %</SelectItem>
              <SelectItem value="pnlValue">Profit &amp; Loss $</SelectItem>
              <SelectItem value="shares">Shares</SelectItem>
              <SelectItem value="alpha">Alphabetically</SelectItem>
              <SelectItem value="endingSoon">Ending soon</SelectItem>
              <SelectItem value="payout">Payout</SelectItem>
              <SelectItem value="latestPrice">Latest Price</SelectItem>
              <SelectItem value="avgCost">Average cost per share</SelectItem>
            </SelectContent>
          </Select>

          {showMergeButton && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 rounded-lg"
              onClick={onMergeClick}
              aria-label="Merge positions"
            >
              <MergeIcon className="size-4 rotate-90" />
            </Button>
          )}
        </div>
      </div>

    </div>
  )
}

interface FetchUserPositionsParams {
  pageParam: number
  userAddress: string
  status: 'active' | 'closed'
  minAmountFilter: string
  searchQuery?: string
  signal?: AbortSignal
}

interface DataApiPosition {
  proxyWallet?: string
  asset?: string
  conditionId?: string
  size?: number
  avgPrice?: number
  initialValue?: number
  currentValue?: number
  curPrice?: number
  cashPnl?: number
  totalBought?: number
  realizedPnl?: number
  percentPnl?: number
  percentRealizedPnl?: number
  redeemable?: boolean
  mergeable?: boolean
  title?: string
  slug?: string
  icon?: string
  eventSlug?: string
  outcome?: string
  outcomeIndex?: number
  oppositeOutcome?: string
  oppositeAsset?: string
  timestamp?: number
}

const DATA_API_URL = process.env.DATA_URL!

function mapDataApiPosition(position: DataApiPosition, status: 'active' | 'closed'): PublicPosition {
  const slug = position.slug || position.conditionId || 'unknown-market'
  const eventSlug = position.eventSlug || slug
  const timestampMs = typeof position.timestamp === 'number'
    ? position.timestamp * 1000
    : Date.now()
  const currentValue = Number.isFinite(position.currentValue) ? Number(position.currentValue) : 0
  const realizedValue = Number.isFinite(position.realizedPnl)
    ? Number(position.realizedPnl)
    : currentValue
  const normalizedValue = status === 'closed' ? realizedValue : currentValue

  return {
    id: `${position.conditionId || slug}-${position.outcomeIndex ?? 0}-${status}`,
    title: position.title || 'Untitled market',
    slug,
    eventSlug,
    icon: position.icon,
    conditionId: position.conditionId,
    avgPrice: Number.isFinite(position.avgPrice) ? Number(position.avgPrice) : 0,
    currentValue: normalizedValue,
    curPrice: Number.isFinite(position.curPrice) ? Number(position.curPrice) : undefined,
    timestamp: timestampMs,
    status,
    outcome: position.outcome,
    outcomeIndex: position.outcomeIndex,
    oppositeOutcome: position.oppositeOutcome,
    mergeable: Boolean(position.mergeable),
    size: typeof position.size === 'number' ? position.size : undefined,
  }
}

function buildMergeableMarkets(positions: PublicPosition[]): MergeableMarket[] {
  const activeMergeable = positions.filter(
    position => position.status === 'active' && position.mergeable && position.conditionId,
  )

  const grouped = new Map<string, PublicPosition[]>()

  activeMergeable.forEach((position) => {
    const key = position.conditionId as string
    const existing = grouped.get(key) ?? []
    grouped.set(key, [...existing, position])
  })

  const markets: MergeableMarket[] = []

  grouped.forEach((groupPositions, conditionId) => {
    const outcomes = new Map<string, PublicPosition>()

    groupPositions.forEach((position) => {
      const outcomeKey = typeof position.outcomeIndex === 'number'
        ? position.outcomeIndex.toString()
        : position.outcome ?? 'unknown'

      const existing = outcomes.get(outcomeKey)
      if (!existing || (position.size ?? 0) > (existing.size ?? 0)) {
        outcomes.set(outcomeKey, position)
      }
    })

    if (outcomes.size < 2) {
      return
    }

    const outcomePositions = Array.from(outcomes.values())
    const mergeableAmount = Math.min(
      ...outcomePositions
        .map(position => position.size ?? 0)
        .filter(amount => amount > 0),
    )

    if (!Number.isFinite(mergeableAmount) || mergeableAmount <= 0) {
      return
    }

    const displayValue = Math.min(
      ...outcomePositions
        .map(position => position.currentValue ?? position.size ?? 0)
        .filter(amount => amount > 0),
    )

    const sample = outcomePositions[0]

    markets.push({
      conditionId,
      eventSlug: sample.eventSlug || sample.slug,
      title: sample.title,
      icon: sample.icon,
      mergeAmount: mergeableAmount,
      displayValue: Number.isFinite(displayValue) && displayValue > 0 ? displayValue : mergeableAmount,
    })
  })

  return markets
}

type ConditionShares = Record<typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO, number>

function normalizeOrderShares(value: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0
  }
  return numeric > 100_000 ? numeric / MICRO_UNIT : numeric
}

async function fetchLockedSharesByCondition(markets: MergeableMarket[]): Promise<Record<string, ConditionShares>> {
  const uniqueKeys = Array.from(new Map(
    markets
      .filter(market => market.conditionId && market.eventSlug)
      .map(market => [`${market.eventSlug}:${market.conditionId}`, { eventSlug: market.eventSlug!, conditionId: market.conditionId }]),
  ).values())

  const lockedByCondition: Record<string, ConditionShares> = {}

  await Promise.all(uniqueKeys.map(async ({ eventSlug, conditionId }) => {
    try {
      const openOrders = await fetchUserOpenOrders({
        pageParam: 0,
        eventSlug,
        conditionId,
      })

      openOrders.forEach((order) => {
        if (order.side !== 'sell') {
          return
        }

        const totalShares = Math.max(
          normalizeOrderShares(order.maker_amount),
          normalizeOrderShares(order.taker_amount),
        )
        const filledShares = normalizeOrderShares(order.size_matched)
        const remainingShares = Math.max(totalShares - Math.min(filledShares, totalShares), 0)
        if (remainingShares <= 0) {
          return
        }

        const outcomeIndex = order.outcome?.index === OUTCOME_INDEX.NO ? OUTCOME_INDEX.NO : OUTCOME_INDEX.YES
        const bucket = lockedByCondition[conditionId] ?? {
          [OUTCOME_INDEX.YES]: 0,
          [OUTCOME_INDEX.NO]: 0,
        }
        bucket[outcomeIndex] += remainingShares
        lockedByCondition[conditionId] = bucket
      })
    }
    catch (error) {
      console.error('Failed to fetch open orders for mergeable lock calculation.', error)
    }
  }))

  return lockedByCondition
}

async function fetchUserPositions({
  pageParam,
  userAddress,
  status,
  minAmountFilter,
  searchQuery,
  signal,
}: FetchUserPositionsParams): Promise<PublicPosition[]> {
  const endpoint = status === 'active' ? '/positions' : '/closed-positions'
  const params = new URLSearchParams({
    user: userAddress,
    limit: '50',
    offset: pageParam.toString(),
    sortDirection: 'DESC',
  })

  if (status === 'active') {
    if (minAmountFilter && minAmountFilter !== 'All') {
      params.set('sizeThreshold', minAmountFilter)
    }
    else {
      params.set('sizeThreshold', '0')
    }
  }

  if (searchQuery && searchQuery.trim()) {
    params.set('title', searchQuery.trim())
  }

  if (status === 'closed') {
    params.set('sortBy', 'TIMESTAMP')
  }

  const response = await fetch(`${DATA_API_URL}${endpoint}?${params.toString()}`, {
    signal,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const errorMessage = errorBody?.error || 'Server error occurred. Please try again later.'
    throw new Error(errorMessage)
  }

  const result = await response.json()
  if (!Array.isArray(result)) {
    throw new TypeError('Unexpected response from data service.')
  }

  return result.map((item: DataApiPosition) => mapDataApiPosition(item, status))
}

interface PublicPositionsListProps {
  userAddress: string
}

export default function PublicPositionsList({ userAddress }: PublicPositionsListProps) {
  const rowGridClass = 'grid grid-cols-[minmax(0,2.2fr)_repeat(4,minmax(0,1fr))_auto] items-center gap-4'
  const queryClient = useQueryClient()
  const { ensureTradingReady } = useTradingOnboarding()
  const user = useUser()
  const { signMessageAsync } = useSignMessage()
  const isMobile = useIsMobile()

  const marketStatusFilter: 'active' | 'closed' = 'active'
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [sortBy, setSortBy] = useState<SortOption>('currentValue')
  const minAmountFilter = 'All'
  const [infiniteScrollError, setInfiniteScrollError] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false)
  const [isMergeProcessing, setIsMergeProcessing] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [sharePosition, setSharePosition] = useState<PublicPosition | null>(null)
  const [shareCardStatus, setShareCardStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [shareCardBlob, setShareCardBlob] = useState<Blob | null>(null)
  const [isCopyingShareImage, setIsCopyingShareImage] = useState(false)
  const [isSharingOnX, setIsSharingOnX] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const handleSearchChange = useCallback((query: string) => {
    setInfiniteScrollError(null)
    setIsLoadingMore(false)
    setRetryCount(0)
    setSearchQuery(query)
  }, [])

  const handleSortChange = useCallback((value: SortOption) => {
    setSortBy(value)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      setInfiniteScrollError(null)
      setIsLoadingMore(false)
      setSearchQuery('')
      setRetryCount(0)
    })
  }, [userAddress])

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery<PublicPosition[]>({
    queryKey: ['user-positions', userAddress, marketStatusFilter, minAmountFilter, debouncedSearchQuery],
    queryFn: ({ pageParam = 0, signal }) =>
      fetchUserPositions({
        pageParam: pageParam as unknown as number,
        userAddress,
        status: marketStatusFilter,
        minAmountFilter,
        searchQuery: debouncedSearchQuery,
        signal,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 50) {
        return allPages.reduce((total, page) => total + page.length, 0)
      }
      return undefined
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    enabled: Boolean(userAddress),
  })

  const positions = useMemo(
    () => data?.pages.flat() ?? [],
    [data?.pages],
  )

  const sortedPositions = useMemo(() => {
    const list = [...positions]

    list.sort((a, b) => {
      switch (sortBy) {
        case 'currentValue':
          return getValue(b) - getValue(a)
        case 'trade':
          return getTradeValue(b) - getTradeValue(a)
        case 'pnlPercent':
          return getPnlPercent(b) - getPnlPercent(a)
        case 'pnlValue':
          return getPnlValue(b) - getPnlValue(a)
        case 'shares':
          return (b.size ?? 0) - (a.size ?? 0)
        case 'alpha':
          return a.title.localeCompare(b.title)
        case 'endingSoon':
          return (a.timestamp ?? 0) - (b.timestamp ?? 0)
        case 'payout':
          return getValue(b) - getValue(a)
        case 'latestPrice':
          return (b.curPrice ?? 0) - (a.curPrice ?? 0)
        case 'avgCost':
          return (b.avgPrice ?? 0) - (a.avgPrice ?? 0)
        default:
          return 0
      }
    })

    return list
  }, [positions, sortBy])

  const loading = status === 'pending'
  const hasInitialError = status === 'error'

  const isSearchActive = debouncedSearchQuery.trim().length > 0
  const mergeableMarkets = useMemo(
    () => buildMergeableMarkets(positions),
    [positions],
  )
  const positionsByCondition = useMemo(() => {
    const map: Record<string, ConditionShares> = {}

    positions
      .filter(position => position.status === 'active' && position.conditionId)
      .forEach((position) => {
        const conditionId = position.conditionId as string
        const outcomeIndex = position.outcomeIndex === OUTCOME_INDEX.NO ? OUTCOME_INDEX.NO : OUTCOME_INDEX.YES
        const size = typeof position.size === 'number' ? position.size : 0
        if (!map[conditionId]) {
          map[conditionId] = {
            [OUTCOME_INDEX.YES]: 0,
            [OUTCOME_INDEX.NO]: 0,
          }
        }
        map[conditionId][outcomeIndex] += size
      })

    return map
  }, [positions])
  const hasMergeableMarkets = mergeableMarkets.length > 0

  useEffect(() => {
    setInfiniteScrollError(null)
    setIsLoadingMore(false)

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [debouncedSearchQuery, minAmountFilter, marketStatusFilter])

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
            setRetryCount(0)
          })
          .catch((error) => {
            setIsLoadingMore(false)
            if (error.name !== 'AbortError') {
              setInfiniteScrollError(error.message || 'Failed to load more positions')
            }
          })
      }
    }, { rootMargin: '200px' })

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, infiniteScrollError, isFetchingNextPage, isLoadingMore])

  const retryInitialLoad = useCallback(() => {
    const currentRetryCount = retryCount + 1
    setRetryCount(currentRetryCount)
    setInfiniteScrollError(null)
    setIsLoadingMore(false)

    const delay = Math.min(1000 * 2 ** (currentRetryCount - 1), 8000)

    setTimeout(() => {
      void refetch()
    }, delay)
  }, [refetch, retryCount])

  const handleMergeAll = useCallback(async () => {
    if (!hasMergeableMarkets) {
      toast.info('No mergeable positions available right now.')
      return
    }

    if (!ensureTradingReady()) {
      return
    }

    if (!user?.proxy_wallet_address || !user?.address) {
      toast.error('Deploy your proxy wallet before merging shares.')
      return
    }

    const lockedSharesByCondition = await fetchLockedSharesByCondition(mergeableMarkets)

    const preparedMerges = mergeableMarkets
      .filter(market => market.mergeAmount > 0 && market.conditionId)
      .map((market) => {
        const conditionId = market.conditionId as string
        const positionShares = positionsByCondition[conditionId]
        if (!positionShares) {
          return null
        }

        const locked = lockedSharesByCondition[conditionId] ?? {
          [OUTCOME_INDEX.YES]: 0,
          [OUTCOME_INDEX.NO]: 0,
        }
        const availableYes = Math.max(0, positionShares[OUTCOME_INDEX.YES] - locked[OUTCOME_INDEX.YES])
        const availableNo = Math.max(0, positionShares[OUTCOME_INDEX.NO] - locked[OUTCOME_INDEX.NO])
        const safeMergeAmount = Math.min(market.mergeAmount, availableYes, availableNo)

        if (!Number.isFinite(safeMergeAmount) || safeMergeAmount <= 0) {
          return null
        }

        return {
          conditionId,
          mergeAmount: safeMergeAmount,
        }
      })
      .filter((entry): entry is { conditionId: string, mergeAmount: number } => Boolean(entry))

    if (preparedMerges.length === 0) {
      toast.info('No eligible pairs to merge.')
      return
    }

    const transactions = preparedMerges.map(entry =>
      buildMergePositionTransaction({
        conditionId: entry.conditionId as `0x${string}`,
        partition: [...DEFAULT_CONDITION_PARTITION],
        amount: toMicro(entry.mergeAmount),
        parentCollectionId: ZERO_COLLECTION_ID,
      }),
    )

    if (transactions.length === 0) {
      toast.info('No eligible pairs to merge.')
      return
    }

    setIsMergeProcessing(true)

    try {
      const nonceResult = await getSafeNonceAction()
      if (nonceResult.error || !nonceResult.nonce) {
        toast.error(nonceResult.error ?? DEFAULT_ERROR_MESSAGE)
        setIsMergeProcessing(false)
        return
      }

      const aggregated = aggregateSafeTransactions(transactions)
      const typedData = getSafeTxTypedData({
        chainId: defaultNetwork.id,
        safeAddress: user.proxy_wallet_address as `0x${string}`,
        transaction: aggregated,
        nonce: nonceResult.nonce,
      })

      const { signatureParams, ...safeTypedData } = typedData
      const structHash = hashTypedData({
        domain: safeTypedData.domain,
        types: safeTypedData.types,
        primaryType: safeTypedData.primaryType,
        message: safeTypedData.message,
      }) as `0x${string}`

      const signature = await signMessageAsync({
        message: { raw: structHash },
      })

      const payload: SafeTransactionRequestPayload = {
        type: 'SAFE',
        from: user.address,
        to: aggregated.to,
        proxyWallet: user.proxy_wallet_address,
        data: aggregated.data,
        nonce: nonceResult.nonce,
        signature: packSafeSignature(signature as `0x${string}`),
        signatureParams,
        metadata: 'merge_position',
      }

      const response = await submitSafeTransactionAction(payload)

      if (response?.error) {
        toast.error(response.error)
        setIsMergeProcessing(false)
        return
      }

      toast.success('Merge submitted', {
        description: 'We sent a merge transaction for your eligible positions.',
      })

      setIsMergeDialogOpen(false)
      setIsMergeProcessing(false)

      void queryClient.invalidateQueries({ queryKey: ['user-positions'] })
      void queryClient.invalidateQueries({ queryKey: [SAFE_BALANCE_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: ['user-conditional-shares'] })
      void queryClient.refetchQueries({ queryKey: ['user-conditional-shares'], type: 'active' })

      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['user-positions'] })
        void queryClient.invalidateQueries({ queryKey: [SAFE_BALANCE_QUERY_KEY] })
        void queryClient.invalidateQueries({ queryKey: ['user-conditional-shares'] })
      }, 3000)
    }
    catch (error) {
      console.error('Failed to submit merge operation.', error)
      toast.error('We could not submit your merge request. Please try again.')
    }
    finally {
      setIsMergeProcessing(false)
    }
  }, [
    ensureTradingReady,
    hasMergeableMarkets,
    mergeableMarkets,
    positionsByCondition,
    queryClient,
    signMessageAsync,
    user?.address,
    user?.proxy_wallet_address,
  ])

  const totals = useMemo(() => {
    const trade = positions.reduce((sum, position) => {
      const tradeValue = (position.size ?? 0) * (position.avgPrice ?? 0)
      return sum + tradeValue
    }, 0)
    const value = positions.reduce((sum, position) => sum + (position.currentValue ?? 0), 0)
    const toWin = positions.reduce((sum, position) => sum + (position.size ?? 0), 0)
    const diff = value - trade
    const pct = trade > 0 ? (diff / trade) * 100 : 0
    return { trade, value, diff, pct, toWin }
  }, [positions])

  const shareCardPayload = useMemo(() => {
    if (!sharePosition) {
      return null
    }
    const payload = buildShareCardPayload(sharePosition)
    return {
      ...payload,
      userName: user?.username || undefined,
      userImage: user?.image || undefined,
    }
  }, [sharePosition, user?.image, user?.username])

  const shareCardUrl = useMemo(() => {
    if (!shareCardPayload) {
      return ''
    }
    return buildShareCardUrl(shareCardPayload)
  }, [shareCardPayload])

  useEffect(() => {
    if (!isShareDialogOpen || !shareCardUrl) {
      return
    }
    setShareCardStatus('loading')
  }, [isShareDialogOpen, shareCardUrl])

  useEffect(() => {
    if (!shareCardUrl || shareCardStatus !== 'ready') {
      setShareCardBlob(null)
      return
    }

    let isCancelled = false

    fetch(shareCardUrl, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Share card fetch failed.')
        }
        return await response.blob()
      })
      .then((blob) => {
        if (!isCancelled) {
          setShareCardBlob(blob)
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.warn('Failed to preload share card image.', error)
          setShareCardBlob(null)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [shareCardStatus, shareCardUrl])

  const handleShareOpenChange = useCallback((open: boolean) => {
    setIsShareDialogOpen(open)
    if (!open) {
      setSharePosition(null)
      setShareCardStatus('idle')
      setShareCardBlob(null)
      setIsCopyingShareImage(false)
      setIsSharingOnX(false)
    }
  }, [])

  const handleShareClick = useCallback((position: PublicPosition) => {
    setSharePosition(position)
    setIsShareDialogOpen(true)
  }, [])

  const handleShareCardLoaded = useCallback(() => {
    setShareCardStatus('ready')
  }, [])

  const handleShareCardError = useCallback(() => {
    setShareCardStatus('error')
    toast.error('Unable to generate a share card right now.')
  }, [])

  const handleCopyShareImage = useCallback(async () => {
    if (!shareCardUrl) {
      return
    }

    setIsCopyingShareImage(true)
    try {
      if (!shareCardBlob) {
        toast.info('Share card is still preparing. Try again in a moment.')
        return
      }

      const blob = shareCardBlob.type ? shareCardBlob : new Blob([shareCardBlob], { type: 'image/png' })
      const filename = 'position.png'

      if (typeof window !== 'undefined' && window.isSecureContext && 'ClipboardItem' in window) {
        try {
          const clipboardItem = new ClipboardItem({ [blob.type || 'image/png']: blob })
          await navigator.clipboard.write([clipboardItem])
          toast.success('Share card copied to clipboard.')
          return
        }
        catch (error) {
          console.warn('Clipboard write failed, falling back to download.', error)
        }
      }

      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      toast.success('Share card downloaded.')
    }
    catch (error) {
      console.error('Failed to copy share card image.', error)
      toast.error('Could not copy the share card image.')
    }
    finally {
      setIsCopyingShareImage(false)
    }
  }, [shareCardBlob, shareCardUrl])

  const handleShareOnX = useCallback(() => {
    if (!shareCardPayload || !shareCardUrl) {
      return
    }

    setIsSharingOnX(true)
    try {
      const outcomeLabel = shareCardPayload.outcome.toUpperCase()
      const shareText = `Bought ${outcomeLabel} on "${shareCardPayload.title}".`
      const baseUrl = window.location.origin
      const shareCardAbsoluteUrl = new URL(shareCardUrl, baseUrl).toString()

      const shareUrl = new URL('https://x.com/intent/tweet')
      shareUrl.searchParams.set('text', shareText)
      shareUrl.searchParams.set('url', shareCardAbsoluteUrl)
      window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer')
    }
    finally {
      setIsSharingOnX(false)
    }
  }, [shareCardPayload, shareCardUrl])

  function renderRows() {
    return sortedPositions.map((position, index) => {
      const imageSrc = position.icon ? `https://gateway.irys.xyz/${position.icon}` : null
      const avgPrice = position.avgPrice ?? 0
      const nowPrice = Number.isFinite(position.curPrice) && position.curPrice !== undefined
        ? position.curPrice!
        : avgPrice
      const shares = position.size ?? 0
      const tradeValue = shares * avgPrice
      const currentValue = Number.isFinite(position.currentValue) ? Number(position.currentValue) : 0
      const toWinValue = shares
      const pnlDiff = currentValue - tradeValue
      const pnlPct = tradeValue > 0 ? (pnlDiff / tradeValue) * 100 : 0
      const outcomeLabel = position.outcome ?? '—'
      const outcomeColor = outcomeLabel.toLowerCase().includes('yes') ? 'bg-yes/15 text-yes' : 'bg-no/15 text-no'
      const eventSlug = position.eventSlug || position.slug

      return (
        <div
          key={`${position.id}-${index}`}
          className={cn(
            rowGridClass,
            `
              border-b border-border/60 px-2 py-3 transition-colors
              first:border-t first:border-border/60
              last:border-b-0
              hover:bg-muted/50
              sm:px-3
            `,
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            <Link
              href={`/event/${eventSlug}`}
              className="relative size-12 shrink-0 overflow-hidden rounded bg-muted"
            >
              {imageSrc
                ? (
                    <Image
                      src={imageSrc}
                      alt={position.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )
                : (
                    <div className="grid size-full place-items-center text-2xs text-muted-foreground">No image</div>
                  )}
            </Link>
            <div className="min-w-0 space-y-1">
              <Link
                href={`/event/${eventSlug}`}
                className={`
                  block max-w-[64ch] truncate text-sm font-semibold text-foreground no-underline
                  hover:no-underline
                `}
                title={position.title}
              >
                {position.title}
              </Link>
              <div className="flex flex-wrap items-center gap-1.5 text-2xs">
                <span className={cn('inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-2xs font-semibold', outcomeColor)}>
                  {outcomeLabel}
                  {' '}
                  {formatCentsLabel(avgPrice, { fallback: '—' })}
                </span>
                {Number.isFinite(position.size) && (
                  <span className="text-muted-foreground">
                    {(position.size ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    {' '}
                    shares
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-left text-sm text-foreground">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">{formatCentsLabel(avgPrice, { fallback: '—' })}</span>
              <ArrowRightIcon className="size-3 text-muted-foreground" />
              <span className="text-foreground">{formatCentsLabel(nowPrice, { fallback: '—' })}</span>
            </div>
          </div>

          <div className="text-center text-sm font-semibold text-muted-foreground">
            {formatCurrencyValue(tradeValue)}
          </div>

          <div className="text-center text-sm font-semibold text-muted-foreground">
            {formatCurrencyValue(toWinValue)}
          </div>

          <div className="text-right text-sm font-semibold text-foreground">
            {formatCurrencyValue(toWinValue)}
            <div className={cn('text-xs', pnlDiff >= 0 ? 'text-yes' : 'text-no')}>
              {`${pnlDiff >= 0 ? '+' : '-'}${formatCurrency(Math.abs(pnlDiff))}`}
              {' '}
              (
              {Math.abs(pnlPct).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
              %)
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm">Sell</Button>
            <Button
              size="icon"
              variant="outline"
              className="rounded-lg"
              onClick={() => handleShareClick(position)}
              aria-label={`Share ${position.title}`}
            >
              <ShareIcon className="size-4" />
            </Button>
          </div>
        </div>
      )
    })
  }

  const isShareReady = shareCardStatus === 'ready'
  const shareDialogBody = (
    <div className="space-y-4">
      <div className={`
        relative flex min-h-55 items-center justify-center rounded-lg border border-border/60 bg-muted/30 p-3
      `}
      >
        {shareCardUrl && (
          // eslint-disable-next-line next/no-img-element
          <img
            key={shareCardUrl}
            src={shareCardUrl}
            alt={`${shareCardPayload?.title ?? 'Position'} share card`}
            className={cn(
              'w-full max-w-md rounded-md shadow transition-opacity',
              isShareReady ? 'opacity-100' : 'opacity-0',
            )}
            onLoad={handleShareCardLoaded}
            onError={handleShareCardError}
          />
        )}
        {!isShareReady && (
          <div className={`
            absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground
          `}
          >
            {shareCardStatus === 'error'
              ? (
                  <span>Unable to generate share card.</span>
                )
              : (
                  <>
                    <Loader2Icon className="size-5 animate-spin" />
                    <span>Generating share card...</span>
                  </>
                )}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleCopyShareImage}
          disabled={!isShareReady || isCopyingShareImage || isSharingOnX}
        >
          {isCopyingShareImage
            ? <Loader2Icon className="size-4 animate-spin" />
            : <CopyIcon className="size-4" />}
          {isCopyingShareImage ? 'Copying...' : 'Copy image'}
        </Button>
        <Button
          className="flex-1"
          onClick={handleShareOnX}
          disabled={!isShareReady || isCopyingShareImage || isSharingOnX}
        >
          {isSharingOnX
            ? <Loader2Icon className="size-4 animate-spin" />
            : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 251 256"
                  className="size-4"
                  aria-hidden="true"
                >
                  <path
                    d="M149.079 108.399L242.33 0h-22.098l-80.97 94.12L74.59 0H0l97.796 142.328L0 256h22.1l85.507-99.395L175.905 256h74.59L149.073 108.399zM118.81 143.58l-9.909-14.172l-78.84-112.773h33.943l63.625 91.011l9.909 14.173l82.705 118.3H186.3l-67.49-96.533z"
                    fill="currentColor"
                  />
                </svg>
              )}
          {isSharingOnX ? 'Opening...' : 'Share'}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-3 pb-0">
      <PositionsFilterControls
        searchQuery={searchQuery}
        sortBy={sortBy}
        handleSearchChange={handleSearchChange}
        handleSortChange={handleSortChange}
        showMergeButton={hasMergeableMarkets && marketStatusFilter === 'active'}
        onMergeClick={() => setIsMergeDialogOpen(true)}
      />

      <div className="overflow-x-auto">
        <div className="min-w-180">
          <div
            className={cn(
              rowGridClass,
              `px-2 pt-2 pb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:px-3`,
            )}
          >
            <div className="pl-15 text-left">Market</div>
            <div className="text-left">Avg → Now</div>
            <div className="text-center">Trade</div>
            <div className="text-center">To win</div>
            <div className="text-right">Value</div>
            <div className="flex justify-end">
              <div className="w-24" aria-hidden />
            </div>
          </div>

          {hasInitialError && (
            <PublicPositionsError
              isSearchActive={isSearchActive}
              searchQuery={debouncedSearchQuery}
              retryCount={retryCount}
              isLoading={loading}
              onRetry={retryInitialLoad}
              onRefreshPage={() => window.location.reload()}
            />
          )}

          {loading && (
            <PublicPositionsLoadingState
              skeletonCount={5}
              isSearchActive={isSearchActive}
              searchQuery={debouncedSearchQuery}
              marketStatusFilter={marketStatusFilter}
              retryCount={retryCount}
            />
          )}

          {!loading && positions.length === 0 && !hasInitialError && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {marketStatusFilter === 'active' ? 'No positions found.' : 'No closed positions found.'}
            </div>
          )}

          {!loading && positions.length > 0 && (
            <div className="space-y-0">
              {renderRows()}

              <div
                className={cn(
                  rowGridClass,
                  `border-b border-border/80 px-2 py-3 sm:px-3`,
                )}
              >
                <div className="pl-15 text-sm font-semibold text-foreground">Total</div>
                <div className="text-sm text-muted-foreground" />
                <div className="text-center text-sm font-semibold text-foreground">
                  {formatCurrencyValue(totals.trade)}
                </div>
                <div className="text-center text-sm font-semibold text-foreground">
                  {formatCurrencyValue(totals.toWin)}
                </div>
                <div className="text-right text-sm font-semibold text-foreground">
                  {formatCurrencyValue(totals.value)}
                  <div className={cn('text-xs', totals.diff >= 0 ? 'text-yes' : 'text-no')}>
                    {`${totals.diff >= 0 ? '+' : ''}${formatCurrency(Math.abs(totals.diff))}`}
                    {' '}
                    (
                    {totals.pct.toFixed(2)}
                    %)
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="w-24" aria-hidden />
                </div>
              </div>
              <div ref={loadMoreRef} className="h-0" />
            </div>
          )}
        </div>
      </div>

      {(isFetchingNextPage || isLoadingMore) && (
        <div className="py-4 text-center text-xs text-muted-foreground">Loading more...</div>
      )}

      {infiniteScrollError && (
        <div className="py-4 text-center text-xs text-no">
          {infiniteScrollError}
          {' '}
          <button type="button" onClick={retryInitialLoad} className="underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      <MergePositionsDialog
        open={isMergeDialogOpen}
        onOpenChange={setIsMergeDialogOpen}
        markets={mergeableMarkets}
        isProcessing={isMergeProcessing}
        onConfirm={handleMergeAll}
      />

      {isMobile
        ? (
            <Drawer open={isShareDialogOpen} onOpenChange={handleShareOpenChange}>
              <DrawerContent className="max-h-[90vh] w-full border-border/70 bg-background">
                <DrawerHeader className="text-center sm:text-center">
                  <DrawerTitle className="text-xl font-semibold">Shill your bag</DrawerTitle>
                </DrawerHeader>
                <div className="space-y-4 px-4 pb-6">
                  {shareDialogBody}
                </div>
              </DrawerContent>
            </Drawer>
          )
        : (
            <Dialog open={isShareDialogOpen} onOpenChange={handleShareOpenChange}>
              <DialogContent className="max-w-md space-y-4">
                <DialogHeader className="text-center sm:text-center">
                  <DialogTitle className="text-xl font-semibold">Shill your bag</DialogTitle>
                </DialogHeader>
                {shareDialogBody}
              </DialogContent>
            </Dialog>
          )}
    </div>
  )
}
