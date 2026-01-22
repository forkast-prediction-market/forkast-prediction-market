import type { MarketPositionTag } from '@/app/(platform)/event/[slug]/_components/EventMarketCard'
import type { MarketDetailTab } from '@/app/(platform)/event/[slug]/_hooks/useMarketDetailController'
import type { SharesByCondition } from '@/app/(platform)/event/[slug]/_hooks/useUserShareBalances'
import type { OrderBookSummariesResponse } from '@/app/(platform)/event/[slug]/_types/EventOrderBookTypes'
import type { DataApiActivity } from '@/lib/data-api/user'
import type { Event, UserPosition } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { LockKeyhole, RefreshCwIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SellPositionModal from '@/app/(platform)/_components/SellPositionModal'
import EventMarketCard from '@/app/(platform)/event/[slug]/_components/EventMarketCard'
import EventMarketHistory from '@/app/(platform)/event/[slug]/_components/EventMarketHistory'
import EventMarketOpenOrders from '@/app/(platform)/event/[slug]/_components/EventMarketOpenOrders'
import EventMarketPositions from '@/app/(platform)/event/[slug]/_components/EventMarketPositions'
import EventOrderBook, { useOrderBookSummaries } from '@/app/(platform)/event/[slug]/_components/EventOrderBook'
import MarketChannelStatusIndicator from '@/app/(platform)/event/[slug]/_components/MarketChannelStatusIndicator'
import MarketOutcomeGraph from '@/app/(platform)/event/[slug]/_components/MarketOutcomeGraph'
import { useChanceRefresh } from '@/app/(platform)/event/[slug]/_hooks/useChanceRefresh'
import { useEventMarketRows } from '@/app/(platform)/event/[slug]/_hooks/useEventMarketRows'
import { useMarketDetailController } from '@/app/(platform)/event/[slug]/_hooks/useMarketDetailController'
import { useUserOpenOrdersQuery } from '@/app/(platform)/event/[slug]/_hooks/useUserOpenOrdersQuery'
import { useUserShareBalances } from '@/app/(platform)/event/[slug]/_hooks/useUserShareBalances'
import { calculateMarketFill, normalizeBookLevels } from '@/app/(platform)/event/[slug]/_utils/EventOrderPanelUtils'
import { Button } from '@/components/ui/button'
import { ORDER_SIDE, ORDER_TYPE, OUTCOME_INDEX } from '@/lib/constants'
import { fetchUserActivityData, fetchUserOtherBalance, fetchUserPositionsForMarket } from '@/lib/data-api/user'
import { formatAmountInputValue, formatSharesLabel, fromMicro } from '@/lib/formatters'
import { buildUmaProposeUrl } from '@/lib/uma'
import { cn } from '@/lib/utils'
import { useIsSingleMarket, useOrder } from '@/stores/useOrder'
import { useUser } from '@/stores/useUser'

interface EventMarketsProps {
  event: Event
  isMobile: boolean
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

interface CashOutModalPayload {
  market: Event['markets'][number]
  outcomeLabel: string
  outcomeIndex: typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO
  shares: number
  filledShares: number
  avgPriceCents: number | null
  receiveAmount: number | null
}

export default function EventMarkets({ event, isMobile }: EventMarketsProps) {
  const selectedMarketId = useOrder(state => state.market?.condition_id)
  const selectedOutcome = useOrder(state => state.outcome)
  const setMarket = useOrder(state => state.setMarket)
  const setOutcome = useOrder(state => state.setOutcome)
  const setSide = useOrder(state => state.setSide)
  const setType = useOrder(state => state.setType)
  const setIsMobileOrderPanelOpen = useOrder(state => state.setIsMobileOrderPanelOpen)
  const setUserShares = useOrder(state => state.setUserShares)
  const setAmount = useOrder(state => state.setAmount)
  const inputRef = useOrder(state => state.inputRef)
  const user = useUser()
  const isSingleMarket = useIsSingleMarket()
  const isNegRiskEnabled = Boolean(event.enable_neg_risk || event.neg_risk)
  const isNegRiskAugmented = Boolean(event.neg_risk_augmented)
  const { rows: marketRows, hasChanceData } = useEventMarketRows(event)
  const {
    expandedMarketId,
    orderBookPollingEnabled,
    toggleMarket,
    expandMarket,
    selectDetailTab,
    getSelectedDetailTab,
  } = useMarketDetailController(event.id)
  const chanceRefreshQueryKeys = useMemo(
    () => [
      ['event-price-history', event.id] as const,
      ['event-market-quotes'] as const,
    ],
    [event.id],
  )
  const [chancePulseToken, setChancePulseToken] = useState(0)
  const priceHistoryWasFetchingRef = useRef(false)
  const {
    isFetching: isPriceHistoryFetching,
  } = useChanceRefresh({ queryKeys: chanceRefreshQueryKeys })
  const eventTokenIds = useMemo(() => {
    const ids = new Set<string>()

    event.markets.forEach((market) => {
      market.outcomes.forEach((currentOutcome) => {
        if (currentOutcome.token_id) {
          ids.add(currentOutcome.token_id)
        }
      })
    })

    return Array.from(ids)
  }, [event.markets])
  const shouldEnableOrderBookPolling = !isSingleMarket && orderBookPollingEnabled
  const orderBookQuery = useOrderBookSummaries(eventTokenIds, { enabled: shouldEnableOrderBookPolling })
  const orderBookSummaries = orderBookQuery.data
  const isOrderBookLoading = orderBookQuery.isLoading
  const shouldShowOrderBookLoader = !shouldEnableOrderBookPolling || (isOrderBookLoading && !orderBookSummaries)
  const ownerAddress = useMemo(() => {
    if (user && user.proxy_wallet_address && user.proxy_wallet_status === 'deployed') {
      return user.proxy_wallet_address as `0x${string}`
    }
    return '' as `0x${string}`
  }, [user])
  const { sharesByCondition } = useUserShareBalances({ event, ownerAddress })
  const [cashOutPayload, setCashOutPayload] = useState<CashOutModalPayload | null>(null)
  const { data: userPositions } = useQuery<UserPosition[]>({
    queryKey: ['event-user-positions', ownerAddress, event.id],
    enabled: Boolean(ownerAddress),
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
    refetchInterval: ownerAddress ? 15_000 : false,
    refetchIntervalInBackground: true,
    queryFn: ({ signal }) =>
      fetchUserPositionsForMarket({
        pageParam: 0,
        userAddress: ownerAddress,
        status: 'active',
        signal,
      }),
  })
  const { data: otherBalances } = useQuery({
    queryKey: ['event-other-balance', ownerAddress, event.slug],
    enabled: Boolean(ownerAddress && isNegRiskAugmented && userPositions),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
    queryFn: ({ signal }) =>
      fetchUserOtherBalance({
        eventSlug: event.slug,
        userAddress: ownerAddress,
        signal,
      }),
  })
  const otherShares = useMemo(() => {
    if (!otherBalances?.length) {
      return 0
    }
    return otherBalances.reduce((total, entry) => {
      const size = typeof entry.size === 'number' ? entry.size : 0
      return total + (Number.isFinite(size) ? size : 0)
    }, 0)
  }, [otherBalances])
  const shouldShowOtherRow = isNegRiskAugmented && otherShares > 0
  const { data: eventOpenOrdersData } = useUserOpenOrdersQuery({
    userId: user?.id,
    eventSlug: event.slug,
    enabled: Boolean(user?.id),
  })
  const openOrdersCountByCondition = useMemo(() => {
    const pages = eventOpenOrdersData?.pages ?? []
    return pages.reduce<Record<string, number>>((acc, page) => {
      page.data.forEach((order) => {
        const conditionId = order.market?.condition_id
        if (!conditionId) {
          return
        }
        acc[conditionId] = (acc[conditionId] ?? 0) + 1
      })
      return acc
    }, {})
  }, [eventOpenOrdersData?.pages])
  const positionTagsByCondition = useMemo(() => {
    if (!userPositions?.length) {
      return {}
    }

    const validConditionIds = new Set(event.markets.map(market => market.condition_id))
    const aggregated: Record<
      string,
      Record<typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO, {
        outcomeIndex: typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO
        label: string
        shares: number
        totalCost: number | null
      }>
    > = {}

    userPositions.forEach((position) => {
      const conditionId = position.market?.condition_id
      if (!conditionId || !validConditionIds.has(conditionId)) {
        return
      }

      const quantity = typeof position.total_shares === 'number'
        ? position.total_shares
        : (typeof position.size === 'number' ? position.size : 0)
      if (!quantity || quantity <= 0) {
        return
      }

      const normalizedOutcome = position.outcome_text?.toLowerCase()
      const explicitOutcomeIndex = typeof position.outcome_index === 'number' ? position.outcome_index : undefined
      const resolvedOutcomeIndex = explicitOutcomeIndex != null
        ? explicitOutcomeIndex
        : normalizedOutcome === 'no'
          ? OUTCOME_INDEX.NO
          : OUTCOME_INDEX.YES
      const outcomeLabel = position.outcome_text || (resolvedOutcomeIndex === OUTCOME_INDEX.NO ? 'No' : 'Yes')
      const avgPrice = toNumber(position.avgPrice)
        ?? Number(fromMicro(String(position.average_position ?? 0), 6))
      const normalizedAvgPrice = Number.isFinite(avgPrice) ? avgPrice : null

      if (!aggregated[conditionId]) {
        aggregated[conditionId] = {
          [OUTCOME_INDEX.YES]: { outcomeIndex: OUTCOME_INDEX.YES, label: 'Yes', shares: 0, totalCost: null },
          [OUTCOME_INDEX.NO]: { outcomeIndex: OUTCOME_INDEX.NO, label: 'No', shares: 0, totalCost: null },
        }
      }

      const bucket = resolvedOutcomeIndex === OUTCOME_INDEX.NO ? OUTCOME_INDEX.NO : OUTCOME_INDEX.YES
      const entry = aggregated[conditionId][bucket]
      entry.shares += quantity
      entry.label = outcomeLabel
      if (typeof normalizedAvgPrice === 'number') {
        const contribution = normalizedAvgPrice * quantity
        entry.totalCost = (entry.totalCost ?? 0) + contribution
      }
    })

    return Object.entries(aggregated).reduce<Record<string, MarketPositionTag[]>>((acc, [conditionId, entries]) => {
      const tags = [entries[OUTCOME_INDEX.YES], entries[OUTCOME_INDEX.NO]]
        .map((entry) => {
          const avgPrice = entry.shares > 0 && typeof entry.totalCost === 'number'
            ? entry.totalCost / entry.shares
            : null
          return {
            outcomeIndex: entry.outcomeIndex,
            label: entry.label,
            shares: entry.shares,
            avgPrice,
          }
        })
        .filter(tag => tag.shares > 0)
      if (tags.length > 0) {
        acc[conditionId] = tags
      }
      return acc
    }, {})
  }, [event.markets, userPositions])

  const convertOptions = useMemo(() => {
    if (!isNegRiskEnabled || !userPositions?.length) {
      return []
    }

    const marketsByConditionId = new Map(
      event.markets.map(market => [market.condition_id, market]),
    )

    return userPositions.reduce<Array<{ id: string, label: string, shares: number, conditionId: string }>>(
      (options, position, index) => {
        const conditionId = position.market?.condition_id
        if (!conditionId) {
          return options
        }
        const market = marketsByConditionId.get(conditionId)
        if (!market) {
          return options
        }

        const normalizedOutcome = position.outcome_text?.toLowerCase()
        const explicitOutcomeIndex = typeof position.outcome_index === 'number' ? position.outcome_index : undefined
        const resolvedOutcomeIndex = explicitOutcomeIndex != null
          ? explicitOutcomeIndex
          : normalizedOutcome === 'no'
            ? OUTCOME_INDEX.NO
            : OUTCOME_INDEX.YES
        if (resolvedOutcomeIndex !== OUTCOME_INDEX.NO) {
          return options
        }

        const quantity = toNumber(position.size)
          ?? (typeof position.total_shares === 'number' ? position.total_shares : 0)
        if (!(quantity > 0)) {
          return options
        }

        options.push({
          id: `${conditionId}-no-${index}`,
          label: market.short_title || market.title,
          conditionId,
          shares: quantity,
        })
        return options
      },
      [],
    )
  }, [event.markets, isNegRiskEnabled, userPositions])

  const eventOutcomes = useMemo(() => {
    return event.markets.map(market => ({
      conditionId: market.condition_id,
      questionId: market.question_id,
      label: market.short_title || market.title,
    }))
  }, [event.markets])

  const handleCashOut = useCallback(async (market: Event['markets'][number], tag: MarketPositionTag) => {
    const outcome = market.outcomes.find(item => item.outcome_index === tag.outcomeIndex)
      ?? market.outcomes[tag.outcomeIndex]
    if (!outcome) {
      return
    }

    const tokenId = outcome.token_id ? String(outcome.token_id) : null
    let summary = tokenId ? orderBookSummaries?.[tokenId] : undefined
    if (!summary && tokenId) {
      try {
        const result = await orderBookQuery.refetch()
        summary = result.data?.[tokenId]
      }
      catch {
        summary = undefined
      }
    }
    const bids = normalizeBookLevels(summary?.bids, 'bid')
    const asks = normalizeBookLevels(summary?.asks, 'ask')
    const fill = calculateMarketFill(ORDER_SIDE.SELL, tag.shares, bids, asks)

    setType(ORDER_TYPE.MARKET)
    setSide(ORDER_SIDE.SELL)
    setMarket(market)
    setOutcome(outcome)
    setAmount(formatAmountInputValue(tag.shares, { roundingMode: 'floor' }))
    if (isMobile) {
      setIsMobileOrderPanelOpen(true)
    }

    setCashOutPayload({
      market,
      outcomeLabel: tag.label,
      outcomeIndex: tag.outcomeIndex,
      shares: tag.shares,
      filledShares: fill.filledShares,
      avgPriceCents: fill.avgPriceCents,
      receiveAmount: fill.totalCost > 0 ? fill.totalCost : null,
    })
  }, [isMobile, orderBookQuery, orderBookSummaries, setAmount, setIsMobileOrderPanelOpen, setMarket, setOutcome, setSide, setType])

  const handleCashOutModalChange = useCallback((open: boolean) => {
    if (!open) {
      setCashOutPayload(null)
    }
  }, [])

  const handleCashOutSubmit = useCallback(() => {
    setCashOutPayload(null)
    const form = document.getElementById('event-order-form') as HTMLFormElement | null
    form?.requestSubmit()
  }, [])

  useEffect(() => {
    if (ownerAddress && Object.keys(sharesByCondition).length > 0) {
      setUserShares(sharesByCondition)
    }
  }, [ownerAddress, setUserShares, sharesByCondition])

  useEffect(() => {
    setChancePulseToken(0)
    priceHistoryWasFetchingRef.current = true
  }, [event.id])

  useEffect(() => {
    const wasFetching = priceHistoryWasFetchingRef.current
    priceHistoryWasFetchingRef.current = isPriceHistoryFetching

    if (hasChanceData && wasFetching && !isPriceHistoryFetching) {
      setChancePulseToken(token => token + 1)
    }
  }, [hasChanceData, isPriceHistoryFetching])

  const handleToggle = useCallback((market: Event['markets'][number]) => {
    toggleMarket(market.condition_id)
    setMarket(market)
    setSide(ORDER_SIDE.BUY)

    if (!selectedOutcome || selectedOutcome.condition_id !== market.condition_id) {
      const defaultOutcome = market.outcomes[0]
      if (defaultOutcome) {
        setOutcome(defaultOutcome)
      }
    }
  }, [toggleMarket, selectedOutcome, setMarket, setOutcome, setSide])

  const handleBuy = useCallback((market: Event['markets'][number], outcomeIndex: number, source: 'mobile' | 'desktop') => {
    expandMarket(market.condition_id)
    setMarket(market)
    const outcome = market.outcomes[outcomeIndex]
    if (outcome) {
      setOutcome(outcome)
    }
    setSide(ORDER_SIDE.BUY)

    if (source === 'mobile') {
      setIsMobileOrderPanelOpen(true)
    }
    else {
      inputRef?.current?.focus()
    }
  }, [expandMarket, inputRef, setIsMobileOrderPanelOpen, setMarket, setOutcome, setSide])

  if (isSingleMarket) {
    return <></>
  }

  return (
    <>
      <div className="-mx-4 bg-background lg:mx-0">
        {(marketRows.length > 0 || shouldShowOtherRow) && (
          <div className="mt-4 mr-2 ml-4 border-b border-border lg:mx-0" />
        )}
        {marketRows
          .map((row, index, orderedMarkets) => {
            const { market } = row
            const isExpanded = expandedMarketId === market.condition_id
            const activeOutcomeForMarket = selectedOutcome && selectedOutcome.condition_id === market.condition_id
              ? selectedOutcome
              : market.outcomes[0]
            const chanceHighlightKey = `${market.condition_id}-${chancePulseToken}`
            const activeOutcomeIndex = selectedOutcome && selectedOutcome.condition_id === market.condition_id
              ? selectedOutcome.outcome_index
              : null
            const positionTags = positionTagsByCondition[market.condition_id] ?? []
            const shouldShowSeparator = index !== orderedMarkets.length - 1 || shouldShowOtherRow

            return (
              <div key={market.condition_id} className="transition-colors">
                <EventMarketCard
                  row={row}
                  showMarketIcon={Boolean(event.show_market_icons)}
                  isExpanded={isExpanded}
                  isActiveMarket={selectedMarketId === market.condition_id}
                  activeOutcomeIndex={activeOutcomeIndex}
                  onToggle={() => handleToggle(market)}
                  onBuy={(cardMarket, outcomeIndex, source) => handleBuy(cardMarket, outcomeIndex, source)}
                  chanceHighlightKey={chanceHighlightKey}
                  positionTags={positionTags}
                  openOrdersCount={openOrdersCountByCondition[market.condition_id] ?? 0}
                  onCashOut={handleCashOut}
                />

                <div
                  className={cn(
                    'overflow-hidden transition-all duration-500 ease-in-out',
                    isExpanded
                      ? 'max-h-160 translate-y-0 opacity-100'
                      : 'pointer-events-none max-h-0 -translate-y-2 opacity-0',
                  )}
                  aria-hidden={!isExpanded}
                >
                  <MarketDetailTabs
                    market={market}
                    event={event}
                    isMobile={isMobile}
                    isNegRiskEnabled={isNegRiskEnabled}
                    isNegRiskAugmented={isNegRiskAugmented}
                    convertOptions={convertOptions}
                    eventOutcomes={eventOutcomes}
                    activeOutcomeForMarket={activeOutcomeForMarket}
                    tabController={{
                      selected: getSelectedDetailTab(market.condition_id),
                      select: tabId => selectDetailTab(market.condition_id, tabId),
                    }}
                    orderBookData={{
                      summaries: orderBookSummaries,
                      isLoading: shouldShowOrderBookLoader,
                      refetch: orderBookQuery.refetch,
                      isRefetching: orderBookQuery.isRefetching,
                    }}
                    sharesByCondition={sharesByCondition}
                  />
                </div>

                {shouldShowSeparator && (
                  <div className="mr-2 ml-4 border-b border-border lg:mx-0" />
                )}
              </div>
            )
          })}
        {shouldShowOtherRow && (
          <div className="transition-colors">
            <OtherOutcomeRow shares={otherShares} showMarketIcon={Boolean(event.show_market_icons)} />
          </div>
        )}
        {(marketRows.length > 0 || shouldShowOtherRow) && (
          <div className="mr-2 mb-4 ml-4 border-b border-border lg:mx-0" />
        )}
      </div>

      {cashOutPayload && (
        <SellPositionModal
          open={Boolean(cashOutPayload)}
          onOpenChange={handleCashOutModalChange}
          outcomeLabel={cashOutPayload.outcomeLabel}
          outcomeShortLabel={cashOutPayload.market.short_title || cashOutPayload.market.title}
          outcomeIconUrl={cashOutPayload.market.icon_url}
          fallbackIconUrl={event.icon_url}
          shares={cashOutPayload.shares}
          filledShares={cashOutPayload.filledShares}
          avgPriceCents={cashOutPayload.avgPriceCents}
          receiveAmount={cashOutPayload.receiveAmount}
          onCashOut={handleCashOutSubmit}
          onEditOrder={() => setCashOutPayload(null)}
        />
      )}
    </>
  )
}

function OtherOutcomeRow({ shares, showMarketIcon }: { shares: number, showMarketIcon?: boolean }) {
  const sharesLabel = formatSharesLabel(shares, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <div
      className={cn(
        `
          relative z-0 flex w-full cursor-default flex-col items-start py-3 pr-2 pl-4 transition-all duration-200
          ease-in-out
          before:pointer-events-none before:absolute before:inset-y-0 before:-right-3 before:-left-3 before:-z-10
          before:rounded-lg before:bg-black/5 before:opacity-0 before:transition-opacity before:duration-200
          before:content-['']
          hover:before:opacity-100
          lg:flex-row lg:items-center lg:rounded-lg lg:px-0
          dark:before:bg-white/5
        `,
      )}
    >
      <div className="flex w-full flex-col gap-2 lg:w-2/5">
        <div className="flex items-start gap-3">
          {showMarketIcon && (
            <div className="size-10.5 shrink-0 rounded-md bg-muted/60" aria-hidden="true" />
          )}
          <div className="text-sm font-bold text-foreground">Other</div>
        </div>
        <div>
          <span className={cn(
            `
              inline-flex items-center gap-1 rounded-sm bg-yes/15 px-1.5 py-0.5 text-xs leading-tight font-semibold
              text-yes-foreground
            `,
          )}
          >
            <LockKeyhole className="size-3 text-yes" />
            <span className="tabular-nums">{sharesLabel}</span>
            <span>Yes</span>
          </span>
        </div>
      </div>
    </div>
  )
}

interface MarketDetailTabsProps {
  market: Event['markets'][number]
  event: Event
  isMobile: boolean
  isNegRiskEnabled: boolean
  isNegRiskAugmented: boolean
  convertOptions: Array<{ id: string, label: string, shares: number, conditionId: string }>
  eventOutcomes: Array<{ conditionId: string, questionId?: string, label: string }>
  activeOutcomeForMarket: Event['markets'][number]['outcomes'][number] | undefined
  tabController: {
    selected: MarketDetailTab | undefined
    select: (tabId: MarketDetailTab) => void
  }
  orderBookData: {
    summaries: OrderBookSummariesResponse | undefined
    isLoading: boolean
    refetch: () => Promise<unknown>
    isRefetching: boolean
  }
  sharesByCondition: SharesByCondition
}

function MarketDetailTabs({
  market,
  event,
  isMobile,
  isNegRiskEnabled,
  isNegRiskAugmented,
  convertOptions,
  eventOutcomes,
  activeOutcomeForMarket,
  tabController,
  orderBookData,
  sharesByCondition,
}: MarketDetailTabsProps) {
  const user = useUser()
  const { selected: controlledTab, select } = tabController
  const positionSizeThreshold = 0.01
  const marketShares = sharesByCondition?.[market.condition_id]
  const yesShares = marketShares?.[OUTCOME_INDEX.YES] ?? 0
  const noShares = marketShares?.[OUTCOME_INDEX.NO] ?? 0
  const hasPositions = Boolean(
    user?.proxy_wallet_address
    && marketShares
    && (yesShares >= positionSizeThreshold || noShares >= positionSizeThreshold),
  )

  const { data: openOrdersData } = useUserOpenOrdersQuery({
    userId: user?.id,
    eventSlug: event.slug,
    conditionId: market.condition_id,
    enabled: Boolean(user?.id),
  })
  const hasOpenOrders = useMemo(() => {
    const pages = openOrdersData?.pages ?? []
    return pages.some(page => page.data.length > 0)
  }, [openOrdersData?.pages])

  const { data: historyPreview } = useQuery<DataApiActivity[]>({
    queryKey: ['user-market-activity-preview', user?.proxy_wallet_address, market.condition_id],
    queryFn: ({ signal }) =>
      fetchUserActivityData({
        pageParam: 0,
        userAddress: user?.proxy_wallet_address ?? '',
        conditionId: market.condition_id,
        signal,
      }),
    enabled: Boolean(user?.proxy_wallet_address && market.condition_id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })
  const hasHistory = useMemo(
    () => (historyPreview ?? []).some(activity =>
      activity.type?.toLowerCase() === 'trade'
      && activity.conditionId === market.condition_id),
    [historyPreview, market.condition_id],
  )

  const visibleTabs = useMemo(() => {
    const tabs: Array<{ id: MarketDetailTab, label: string }> = [
      { id: 'orderBook', label: 'Order Book' },
      { id: 'graph', label: 'Graph' },
    ]

    if (hasOpenOrders) {
      tabs.splice(1, 0, { id: 'openOrders', label: 'Open Orders' })
    }
    if (hasPositions) {
      tabs.unshift({ id: 'positions', label: 'Positions' })
    }
    if (hasHistory) {
      tabs.push({ id: 'history', label: 'History' })
    }
    tabs.push({ id: 'resolution', label: 'Resolution' })
    return tabs
  }, [hasHistory, hasOpenOrders, hasPositions])

  const selectedTab = useMemo<MarketDetailTab>(() => {
    if (controlledTab && visibleTabs.some(tab => tab.id === controlledTab)) {
      return controlledTab
    }
    return visibleTabs[0]?.id ?? 'orderBook'
  }, [controlledTab, visibleTabs])

  const proposeUrl = useMemo(() => buildUmaProposeUrl(market.condition), [market.condition])

  useEffect(() => {
    if (selectedTab !== controlledTab) {
      select(selectedTab)
    }
  }, [controlledTab, select, selectedTab])

  return (
    <div className="pt-2">
      <div className="px-0">
        <div className="flex items-center gap-2 border-b">
          <div className="scrollbar-hide flex w-0 flex-1 gap-4 overflow-x-auto">
            {visibleTabs.map((tab) => {
              const isActive = selectedTab === tab.id
              return (
                <button
                  key={`${market.condition_id}-${tab.id}`}
                  type="button"
                  className={cn(
                    `border-b-2 border-transparent pt-1 pb-2 text-sm font-semibold whitespace-nowrap transition-colors`,
                    isActive
                      ? 'border-primary text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={(event) => {
                    event.stopPropagation()
                    select(tab.id)
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <MarketChannelStatusIndicator className="-mt-2" />

          <button
            type="button"
            className={cn(
              `
                -mt-1 ml-auto inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground
                transition-colors
              `,
              'hover:bg-muted/70 hover:text-foreground',
              'focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none',
            )}
            aria-label="Refresh order book"
            title="Refresh order book"
            onClick={() => { void orderBookData.refetch() }}
            disabled={orderBookData.isLoading || orderBookData.isRefetching}
          >
            <RefreshCwIcon
              className={cn(
                'size-3',
                (orderBookData.isLoading || orderBookData.isRefetching) && 'animate-spin',
              )}
            />
          </button>
        </div>
      </div>

      <div className="px-0 py-4">
        {selectedTab === 'orderBook' && (
          <EventOrderBook
            market={market}
            outcome={activeOutcomeForMarket}
            summaries={orderBookData.summaries}
            isLoadingSummaries={orderBookData.isLoading}
            eventSlug={event.slug}
          />
        )}

        {selectedTab === 'graph' && activeOutcomeForMarket && (
          <MarketOutcomeGraph
            market={market}
            outcome={activeOutcomeForMarket}
            allMarkets={event.markets}
            eventCreatedAt={event.created_at}
            isMobile={isMobile}
          />
        )}

        {selectedTab === 'positions' && (
          <EventMarketPositions
            market={market}
            isNegRiskEnabled={isNegRiskEnabled}
            isNegRiskAugmented={isNegRiskAugmented}
            convertOptions={convertOptions}
            eventOutcomes={eventOutcomes}
            negRiskMarketId={event.neg_risk_market_id}
          />
        )}

        {selectedTab === 'openOrders' && <EventMarketOpenOrders market={market} eventSlug={event.slug} />}

        {selectedTab === 'history' && <EventMarketHistory market={market} />}

        {selectedTab === 'resolution' && (
          proposeUrl
            ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mb-3"
                  asChild
                  onClick={event => event.stopPropagation()}
                >
                  <a href={proposeUrl} target="_blank" rel="noopener noreferrer">
                    Propose resolution
                  </a>
                </Button>
              )
            : (
                <Button
                  variant="outline"
                  size="sm"
                  className="mb-3"
                  disabled
                  onClick={event => event.stopPropagation()}
                >
                  Propose resolution
                </Button>
              )
        )}
      </div>
    </div>
  )
}
