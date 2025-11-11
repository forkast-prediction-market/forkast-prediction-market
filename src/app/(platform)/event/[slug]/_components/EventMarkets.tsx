import type { MarketDetailTab } from '@/app/(platform)/event/[slug]/_components/hooks/useMarketDetailController'
import type { Event } from '@/types'
import { RefreshCwIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import EventMarketCard from '@/app/(platform)/event/[slug]/_components/EventMarketCard'
import EventOrderBook, { useOrderBookSummaries } from '@/app/(platform)/event/[slug]/_components/EventOrderBook'
import { useChanceRefresh } from '@/app/(platform)/event/[slug]/_components/hooks/useChanceRefresh'
import { useEventMarketRows } from '@/app/(platform)/event/[slug]/_components/hooks/useEventMarketRows'
import { useMarketDetailController } from '@/app/(platform)/event/[slug]/_components/hooks/useMarketDetailController'
import MarketOutcomeGraph from '@/app/(platform)/event/[slug]/_components/MarketOutcomeGraph'
import { Button } from '@/components/ui/button'
import { ORDER_SIDE, OUTCOME_INDEX } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useIsSingleMarket, useOrder } from '@/stores/useOrder'

const MARKET_DETAIL_TABS: Array<{ id: MarketDetailTab, label: string }> = [
  { id: 'orderBook', label: 'Order Book' },
  { id: 'graph', label: 'Graph' },
  { id: 'resolution', label: 'Resolution' },
]

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
  const inputRef = useOrder(state => state.inputRef)
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

  if (isSingleMarket || !hasChanceData) {
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
          const selectedDetailTab = getSelectedDetailTab(market.condition_id)

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
                <div className="pt-2">
                  <div className="px-4">
                    <div className="flex gap-4 border-b border-border/60">
                      {MARKET_DETAIL_TABS.map((tab) => {
                        const isActive = selectedDetailTab === tab.id
                        return (
                          <button
                            key={`${market.condition_id}-${tab.id}`}
                            type="button"
                            className={cn(
                              'border-b-2 border-transparent pt-1 pb-2 text-sm font-semibold transition-colors',
                              isActive
                                ? 'border-primary text-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                            onClick={(event) => {
                              event.stopPropagation()
                              selectDetailTab(market.condition_id, tab.id)
                            }}
                          >
                            {tab.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="px-4 pt-4">
                    {selectedDetailTab === 'orderBook' && (
                      <EventOrderBook
                        market={market}
                        outcome={activeOutcomeForMarket}
                        summaries={orderBookSummaries}
                        isLoadingSummaries={shouldShowOrderBookLoader}
                        lastPriceOverrideCents={lastPriceOverrideCents}
                      />
                    )}

                    {selectedDetailTab === 'graph' && activeOutcomeForMarket && (
                      <div className="pb-4">
                        <MarketOutcomeGraph
                          market={market}
                          outcome={activeOutcomeForMarket}
                          allMarkets={event.markets}
                          eventCreatedAt={event.created_at}
                          isMobile={isMobile}
                        />
                      </div>
                    )}

                    {selectedDetailTab === 'resolution' && (
                      <div className="pb-4">
                        <div className="flex justify-start">
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
