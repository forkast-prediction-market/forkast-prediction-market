import type { OrderBookSummariesResponse } from '@/app/(platform)/event/[slug]/_components/EventOrderBook'
import type { MarketDetailTab } from '@/app/(platform)/event/[slug]/_hooks/useMarketDetailController'
import type { SharesByCondition } from '@/app/(platform)/event/[slug]/_hooks/useUserShareBalances'
import type { DataApiActivity } from '@/lib/data-api/user'
import type { Event } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { RefreshCwIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import EventMarketCard from '@/app/(platform)/event/[slug]/_components/EventMarketCard'
import EventMarketHistory from '@/app/(platform)/event/[slug]/_components/EventMarketHistory'
import EventMarketOpenOrders from '@/app/(platform)/event/[slug]/_components/EventMarketOpenOrders'
import EventMarketPositions from '@/app/(platform)/event/[slug]/_components/EventMarketPositions'
import EventOrderBook, { useOrderBookSummaries } from '@/app/(platform)/event/[slug]/_components/EventOrderBook'
import MarketOutcomeGraph from '@/app/(platform)/event/[slug]/_components/MarketOutcomeGraph'
import { useChanceRefresh } from '@/app/(platform)/event/[slug]/_hooks/useChanceRefresh'
import { useEventMarketRows } from '@/app/(platform)/event/[slug]/_hooks/useEventMarketRows'
import { useMarketDetailController } from '@/app/(platform)/event/[slug]/_hooks/useMarketDetailController'
import { useUserOpenOrdersQuery } from '@/app/(platform)/event/[slug]/_hooks/useUserOpenOrdersQuery'
import { useUserShareBalances } from '@/app/(platform)/event/[slug]/_hooks/useUserShareBalances'
import { Button } from '@/components/ui/button'
import { ORDER_SIDE, OUTCOME_INDEX } from '@/lib/constants'
import { fetchUserActivityData } from '@/lib/data-api/user'
import { cn } from '@/lib/utils'
import { useIsSingleMarket, useOrder } from '@/stores/useOrder'
import { useUser } from '@/stores/useUser'

const MARKET_DETAIL_PANEL_CLASS = 'rounded-lg border border-border bg-muted/20 p-4 min-h-20 mb-4'

interface EventMarketsProps {
  event: Event
  isMobile: boolean
}

export default function EventMarkets({ event, isMobile }: EventMarketsProps) {
  const selectedMarketId = useOrder(state => state.market?.condition_id)
  const selectedOutcome = useOrder(state => state.outcome)
  const setMarket = useOrder(state => state.setMarket)
  const setOutcome = useOrder(state => state.setOutcome)
  const setSide = useOrder(state => state.setSide)
  const setIsMobileOrderPanelOpen = useOrder(state => state.setIsMobileOrderPanelOpen)
  const setUserShares = useOrder(state => state.setUserShares)
  const inputRef = useOrder(state => state.inputRef)
  const user = useUser()
  const isSingleMarket = useIsSingleMarket()
  const { rows: marketRows, hasChanceData } = useEventMarketRows(event)
  const {
    expandedMarketId,
    orderBookPollingEnabled,
    toggleMarket,
    expandMarket,
    selectDetailTab,
    getSelectedDetailTab,
  } = useMarketDetailController(event.id)
  const priceHistoryQueryKey = useMemo(
    () => ['event-price-history', event.id] as const,
    [event.id],
  )
  const [chancePulseToken, setChancePulseToken] = useState(0)
  const priceHistoryWasFetchingRef = useRef(false)
  const {
    refresh: handleChanceRefresh,
    isDisabled: isChanceRefreshDisabled,
    isRefreshing: isManualChanceRefreshing,
    isFetching: isPriceHistoryFetching,
  } = useChanceRefresh({ queryKey: priceHistoryQueryKey })
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
  const {
    data: orderBookSummaries,
    isLoading: isOrderBookLoading,
  } = useOrderBookSummaries(eventTokenIds, { enabled: shouldEnableOrderBookPolling })
  const shouldShowOrderBookLoader = !shouldEnableOrderBookPolling || (isOrderBookLoading && !orderBookSummaries)
  const ownerAddress = useMemo(() => {
    if (user && user.proxy_wallet_address && user.proxy_wallet_status === 'deployed') {
      return user.proxy_wallet_address as `0x${string}`
    }
    return '' as `0x${string}`
  }, [user])
  const { sharesByCondition } = useUserShareBalances({ event, ownerAddress })

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
    <div className="-mx-4 overflow-hidden bg-background lg:mx-0">
      <div className="relative hidden items-center rounded-t-lg px-4 py-3 lg:flex">
        <span className="pointer-events-none absolute inset-x-4 bottom-0 block border-b border-border/90" />
        <div className="w-2/5">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            OUTCOMES
          </span>
        </div>
        <div className="flex w-1/5 items-center justify-center gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            % CHANCE
          </span>
          <button
            type="button"
            className={cn(
              `
                inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground
                transition-colors
                focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none
              `,
              'hover:bg-muted/80 hover:text-foreground',
              'p-0.5',
            )}
            aria-label="Refresh chance data"
            title="Refresh"
            onClick={handleChanceRefresh}
            disabled={isChanceRefreshDisabled}
          >
            <RefreshCwIcon
              className={cn(
                'size-3',
                isManualChanceRefreshing && 'animate-spin',
              )}
            />
          </button>
        </div>
      </div>

      {marketRows
        .map((row, index, orderedMarkets) => {
          const { market, yesPriceCentsOverride } = row
          const isExpanded = expandedMarketId === market.condition_id
          const activeOutcomeForMarket = selectedOutcome && selectedOutcome.condition_id === market.condition_id
            ? selectedOutcome
            : market.outcomes[0]
          const chanceHighlightKey = `${market.condition_id}-${chancePulseToken}`
          const lastPriceOverrideCents = (() => {
            if (yesPriceCentsOverride === null) {
              return null
            }
            if (!activeOutcomeForMarket) {
              return yesPriceCentsOverride
            }
            return activeOutcomeForMarket.outcome_index === OUTCOME_INDEX.YES
              ? yesPriceCentsOverride
              : Math.max(0, Number((100 - yesPriceCentsOverride).toFixed(1)))
          })()
          const activeOutcomeIndex = selectedOutcome && selectedOutcome.condition_id === market.condition_id
            ? selectedOutcome.outcome_index
            : null

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
              />

              {isExpanded && (
                <MarketDetailTabs
                  market={market}
                  event={event}
                  isMobile={isMobile}
                  activeOutcomeForMarket={activeOutcomeForMarket}
                  tabController={{
                    selected: getSelectedDetailTab(market.condition_id),
                    select: tabId => selectDetailTab(market.condition_id, tabId),
                  }}
                  orderBookData={{
                    summaries: orderBookSummaries,
                    isLoading: shouldShowOrderBookLoader,
                    lastPriceOverrideCents,
                  }}
                  sharesByCondition={sharesByCondition}
                />
              )}

              {index !== orderedMarkets.length - 1 && (
                <div className="mx-2 border-b border-border" />
              )}
            </div>
          )
        })}
    </div>
  )
}

interface MarketDetailTabsProps {
  market: Event['markets'][number]
  event: Event
  isMobile: boolean
  activeOutcomeForMarket: Event['markets'][number]['outcomes'][number] | undefined
  tabController: {
    selected: MarketDetailTab | undefined
    select: (tabId: MarketDetailTab) => void
  }
  orderBookData: {
    summaries: OrderBookSummariesResponse | undefined
    isLoading: boolean
    lastPriceOverrideCents: number | null
  }
  sharesByCondition: SharesByCondition
}

function MarketDetailTabs({
  market,
  event,
  isMobile,
  activeOutcomeForMarket,
  tabController,
  orderBookData,
  sharesByCondition,
}: MarketDetailTabsProps) {
  const user = useUser()
  const { selected: controlledTab, select } = tabController
  const marketShares = sharesByCondition?.[market.condition_id]
  const hasPositions = Boolean(
    user?.proxy_wallet_address
    && marketShares
    && ((marketShares[OUTCOME_INDEX.YES] ?? 0) > 0 || (marketShares[OUTCOME_INDEX.NO] ?? 0) > 0),
  )

  const { data: openOrdersData } = useUserOpenOrdersQuery({
    userId: user?.id,
    eventSlug: event.slug,
    conditionId: market.condition_id,
    enabled: Boolean(user?.id),
  })
  const hasOpenOrders = useMemo(() => {
    const pages = openOrdersData?.pages ?? []
    return pages.some(page => page.length > 0)
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
  const hasHistory = useMemo(() => (historyPreview?.length ?? 0) > 0, [historyPreview?.length])

  const visibleTabs = useMemo(() => {
    const tabs: Array<{ id: MarketDetailTab, label: string }> = [
      { id: 'orderBook', label: 'Order Book' },
      { id: 'graph', label: 'Graph' },
      { id: 'resolution', label: 'Resolution' },
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
    return tabs
  }, [hasHistory, hasOpenOrders, hasPositions])

  const selectedTab = useMemo<MarketDetailTab>(() => {
    if (controlledTab && visibleTabs.some(tab => tab.id === controlledTab)) {
      return controlledTab
    }
    return visibleTabs[0]?.id ?? 'orderBook'
  }, [controlledTab, visibleTabs])

  useEffect(() => {
    if (selectedTab !== controlledTab) {
      select(selectedTab)
    }
  }, [controlledTab, select, selectedTab])

  return (
    <div className="pt-2">
      <div className="px-4">
        <div className="scrollbar-hide flex gap-4 overflow-x-auto border-b border-border/60">
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
      </div>

      <div className="px-4 pt-4">
        {selectedTab === 'orderBook' && (
          <EventOrderBook
            market={market}
            outcome={activeOutcomeForMarket}
            summaries={orderBookData.summaries}
            isLoadingSummaries={orderBookData.isLoading}
            lastPriceOverrideCents={orderBookData.lastPriceOverrideCents}
            eventSlug={event.slug}
          />
        )}

        {selectedTab === 'graph' && activeOutcomeForMarket && (
          <div className={MARKET_DETAIL_PANEL_CLASS}>
            <MarketOutcomeGraph
              market={market}
              outcome={activeOutcomeForMarket}
              allMarkets={event.markets}
              eventCreatedAt={event.created_at}
              isMobile={isMobile}
            />
          </div>
        )}

        {selectedTab === 'positions' && (
          <div className={MARKET_DETAIL_PANEL_CLASS}>
            <EventMarketPositions market={market} />
          </div>
        )}

        {selectedTab === 'openOrders' && (
          <div className={MARKET_DETAIL_PANEL_CLASS}>
            <EventMarketOpenOrders market={market} eventSlug={event.slug} />
          </div>
        )}

        {selectedTab === 'history' && (
          <div className={MARKET_DETAIL_PANEL_CLASS}>
            <EventMarketHistory market={market} />
          </div>
        )}

        {selectedTab === 'resolution' && (
          <div className={MARKET_DETAIL_PANEL_CLASS}>
            <div className="flex min-h-16 items-center justify-center rounded border border-dashed border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={event => event.stopPropagation()}
              >
                Propose resolution
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
