import type { Event } from '@/types'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { RefreshCwIcon, TriangleIcon } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import EventOrderBook, { useOrderBookSummaries } from '@/app/(platform)/event/[slug]/_components/EventOrderBook'
import {
  useEventOutcomeChanceChanges,
  useEventOutcomeChances,
  useMarketYesPrices,
} from '@/app/(platform)/event/[slug]/_components/EventOutcomeChanceProvider'
import { Button } from '@/components/ui/button'
import { ORDER_SIDE, OUTCOME_INDEX } from '@/lib/constants'
import { formatCentsLabel, toCents } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useIsBinaryMarket, useOrder } from '@/stores/useOrder'

interface EventMarketsProps {
  event: Event
}

export default function EventMarkets({ event }: EventMarketsProps) {
  const state = useOrder()
  const isBinaryMarket = useIsBinaryMarket()
  const outcomeChances = useEventOutcomeChances()
  const outcomeChanceChanges = useEventOutcomeChanceChanges()
  const marketYesPrices = useMarketYesPrices()
  const queryClient = useQueryClient()
  const priceHistoryQueryKey = useMemo(
    () => ['event-price-history', event.id] as const,
    [event.id],
  )
  const [expandedMarketId, setExpandedMarketId] = useState<string | null>(null)
  const [orderBookPollingEnabled, setOrderBookPollingEnabled] = useState(false)
  const [isManualChanceRefreshing, setIsManualChanceRefreshing] = useState(false)
  const priceHistoryIsFetching = useIsFetching({ queryKey: priceHistoryQueryKey }) > 0
  const isChanceRefreshDisabled = isManualChanceRefreshing || priceHistoryIsFetching
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
  const shouldEnableOrderBookPolling = !isBinaryMarket && orderBookPollingEnabled
  const {
    data: orderBookSummaries,
    isLoading: isOrderBookLoading,
  } = useOrderBookSummaries(eventTokenIds, { enabled: shouldEnableOrderBookPolling })
  const shouldShowOrderBookLoader = !shouldEnableOrderBookPolling || (isOrderBookLoading && !orderBookSummaries)
  const hasChanceData = useMemo(
    () => event.markets.every(market => Number.isFinite(outcomeChances[market.condition_id])),
    [event.markets, outcomeChances],
  )
  const sortedMarkets = useMemo(() => {
    if (!hasChanceData) {
      return []
    }
    return [...event.markets].sort((a, b) => {
      const aChance = outcomeChances[a.condition_id]
      const bChance = outcomeChances[b.condition_id]
      return (bChance ?? 0) - (aChance ?? 0)
    })
  }, [event.markets, hasChanceData, outcomeChances])

  useEffect(() => {
    if (!state.market) {
      if (isBinaryMarket) {
        state.setMarket(event.markets[0])
        state.setOutcome(event.markets[0].outcomes[0])
      }
      else {
        const highestProbabilityMarket = [...event.markets].sort(
          (a, b) => b.probability - a.probability,
        )[0]
        state.setMarket(highestProbabilityMarket)
        state.setOutcome(highestProbabilityMarket.outcomes[0])
      }
    }
  }, [state, event.markets, isBinaryMarket])

  useEffect(() => {
    setExpandedMarketId(null)
  }, [event.id])

  useEffect(() => {
    setOrderBookPollingEnabled(false)
  }, [event.id])

  async function handleChanceRefresh() {
    if (isManualChanceRefreshing || priceHistoryIsFetching) {
      return
    }

    setIsManualChanceRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: priceHistoryQueryKey, refetchType: 'active' })
    }
    catch (error) {
      console.error('Failed to refresh price history', error)
    }
    finally {
      setIsManualChanceRefreshing(false)
    }
  }

  if (isBinaryMarket || !hasChanceData) {
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

      {sortedMarkets
        .map((market, index, orderedMarkets) => {
          const isExpanded = expandedMarketId === market.condition_id
          const outcomeForMarket = state.outcome && state.outcome.condition_id === market.condition_id
            ? state.outcome
            : market.outcomes[0]
          const yesOutcome = market.outcomes[OUTCOME_INDEX.YES]
          const noOutcome = market.outcomes[OUTCOME_INDEX.NO]
          const yesPriceOverride = marketYesPrices[market.condition_id]
          const normalizedYesPrice = typeof yesPriceOverride === 'number'
            ? Math.max(0, Math.min(1, yesPriceOverride))
            : null
          const yesPriceValue = normalizedYesPrice ?? yesOutcome?.buy_price
          const noPriceValue = normalizedYesPrice != null
            ? Math.max(0, Math.min(1, 1 - normalizedYesPrice))
            : noOutcome?.buy_price
          const yesPriceCentsOverride = normalizedYesPrice != null ? toCents(normalizedYesPrice) : null
          const rawChance = outcomeChances[market.condition_id]
          const normalizedChance = Math.max(0, Math.min(100, rawChance ?? 0))
          const roundedChance = Math.round(normalizedChance)
          const roundedThresholdChance = Math.round(normalizedChance * 10) / 10
          const isSubOnePercent = roundedThresholdChance > 0 && roundedThresholdChance < 1
          const chanceDisplay = isSubOnePercent ? '<1%' : `${roundedChance}%`
          const rawChanceChange = outcomeChanceChanges[market.condition_id]
          const normalizedChanceChange = typeof rawChanceChange === 'number' && Number.isFinite(rawChanceChange)
            ? rawChanceChange
            : 0
          const absoluteChanceChange = Math.abs(normalizedChanceChange)
          const roundedChanceChange = Math.round(absoluteChanceChange)
          const shouldShowChanceChange = roundedChanceChange >= 1
          const chanceChangeLabel = `${roundedChanceChange}%`
          const isChanceChangePositive = normalizedChanceChange > 0
          const chanceChangeColorClass = isChanceChangePositive ? 'text-yes' : 'text-no'
          const lastPriceOverrideCents = (() => {
            if (yesPriceCentsOverride === null) {
              return null
            }
            if (!outcomeForMarket) {
              return yesPriceCentsOverride
            }
            return outcomeForMarket.outcome_index === OUTCOME_INDEX.YES
              ? yesPriceCentsOverride
              : Math.max(0, Number((100 - yesPriceCentsOverride).toFixed(1)))
          })()

          function handleToggle() {
            const currentlyExpanded = expandedMarketId === market.condition_id
            const willExpand = !currentlyExpanded
            if (willExpand && !orderBookPollingEnabled) {
              setOrderBookPollingEnabled(true)
            }
            setExpandedMarketId(willExpand ? market.condition_id : null)
            state.setMarket(market)
            state.setSide(ORDER_SIDE.BUY)
            if (!state.outcome || state.outcome.condition_id !== market.condition_id) {
              state.setOutcome(market.outcomes[0])
            }
          }

          return (
            <div key={market.condition_id} className="transition-colors">
              <div
                className={cn(
                  `
                    flex w-full cursor-pointer flex-col items-start rounded-lg p-4 transition-all duration-200
                    ease-in-out
                    lg:flex-row lg:items-center
                  `,
                  'hover:bg-black/5 dark:hover:bg-white/5',
                )}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={handleToggle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleToggle()
                  }
                }}
              >
                {/* Mobile: Layout in column */}
                <div className="w-full lg:hidden">
                  {/* Row 1: Name and probability */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {event.show_market_icons && (
                        <Image
                          src={market.icon_url}
                          alt={market.title}
                          width={42}
                          height={42}
                          className="flex-shrink-0 rounded-md"
                        />
                      )}
                      <div>
                        <div className="text-sm font-bold">
                          {market.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          $
                          {market.total_volume?.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }) || '0.00'}
                          {' '}
                          Vol.
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={cn(
                          'text-lg font-bold',
                          isSubOnePercent ? 'text-muted-foreground' : 'text-foreground',
                        )}
                      >
                        {chanceDisplay}
                      </span>
                      {shouldShowChanceChange && (
                        <div className={cn('flex items-center gap-1 text-xs font-semibold', chanceChangeColorClass)}>
                          <TriangleIcon
                            className={cn(
                              'size-3 fill-current',
                              isChanceChangePositive ? '' : 'rotate-180',
                            )}
                            fill="currentColor"
                          />
                          <span>{chanceChangeLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="outcome"
                      variant="yes"
                      className={cn({
                        'bg-yes text-white': state.market?.condition_id === market.condition_id && state.outcome?.outcome_index === OUTCOME_INDEX.YES,
                      })}
                      onClick={(e) => {
                        e.stopPropagation()
                        state.setMarket(market)
                        state.setOutcome(market.outcomes[0])
                        state.setSide(ORDER_SIDE.BUY)
                        state.setIsMobileOrderPanelOpen(true)
                      }}
                    >
                      <span className="truncate opacity-70">
                        Buy
                        {' '}
                        {market.outcomes[0].outcome_text}
                      </span>
                      <span className="shrink-0 text-base font-bold">
                        {formatCentsLabel(yesPriceValue)}
                      </span>
                    </Button>
                    <Button
                      size="outcome"
                      variant="no"
                      className={cn({
                        'bg-no text-white': state.market?.condition_id === market.condition_id && state.outcome?.outcome_index === OUTCOME_INDEX.NO,
                      })}
                      onClick={(e) => {
                        e.stopPropagation()
                        state.setMarket(market)
                        state.setOutcome(market.outcomes[1])
                        state.setSide(ORDER_SIDE.BUY)
                        state.setIsMobileOrderPanelOpen(true)
                      }}
                    >
                      <span className="truncate opacity-70">
                        Buy
                        {' '}
                        {market.outcomes[1].outcome_text}
                      </span>
                      <span className="shrink-0 text-base font-bold">
                        {formatCentsLabel(noPriceValue)}
                      </span>
                    </Button>
                  </div>
                </div>

                {/* Desktop: Original line layout */}
                <div className="hidden w-full items-center lg:flex">
                  <div className="flex w-2/5 items-center gap-3">
                    {event.show_market_icons && (
                      <Image
                        src={market.icon_url}
                        alt={market.title}
                        width={42}
                        height={42}
                        className="flex-shrink-0 rounded-md"
                      />
                    )}
                    <div>
                      <div className="font-bold">
                        {market.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        $
                        {market.total_volume?.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }) || '0.00'}
                        {' '}
                        Vol.
                      </div>
                    </div>
                  </div>

                  <div className="flex w-1/5 justify-center">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-3xl font-bold',
                          isSubOnePercent ? 'text-muted-foreground' : 'text-foreground',
                        )}
                      >
                        {chanceDisplay}
                      </span>
                      {shouldShowChanceChange && (
                        <div className={cn('flex items-center gap-1 text-xs font-semibold', chanceChangeColorClass)}>
                          <TriangleIcon
                            className={cn('size-3 fill-current', isChanceChangePositive ? '' : 'rotate-180')}
                            fill="currentColor"
                          />
                          <span>{chanceChangeLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ms-auto flex items-center gap-2">
                    <Button
                      size="outcome"
                      variant="yes"
                      className={cn({
                        'bg-yes text-white': state.market?.condition_id === market.condition_id && state.outcome?.outcome_index === OUTCOME_INDEX.YES,
                      }, 'w-36')}
                      onClick={(e) => {
                        e.stopPropagation()
                        state.setMarket(market)
                        state.setOutcome(market.outcomes[0])
                        state.setSide(ORDER_SIDE.BUY)
                        state.inputRef?.current?.focus()
                      }}
                    >
                      <span className="truncate opacity-70">
                        Buy
                        {' '}
                        {market.outcomes[0].outcome_text}
                      </span>
                      <span className="shrink-0 text-base font-bold">
                        {formatCentsLabel(yesPriceValue)}
                      </span>
                    </Button>

                    <Button
                      size="outcome"
                      variant="no"
                      className={cn({
                        'bg-no text-white': state.market?.condition_id === market.condition_id && state.outcome?.outcome_index === OUTCOME_INDEX.NO,
                      }, 'w-36')}
                      onClick={(e) => {
                        e.stopPropagation()
                        state.setMarket(market)
                        state.setOutcome(market.outcomes[1])
                        state.setSide(ORDER_SIDE.BUY)
                        state.inputRef?.current?.focus()
                      }}
                    >
                      <span className="truncate opacity-70">
                        Buy
                        {' '}
                        {market.outcomes[1].outcome_text}
                      </span>
                      <span className="shrink-0 text-base font-bold">
                        {formatCentsLabel(noPriceValue)}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="pt-2">
                  <EventOrderBook
                    market={market}
                    outcome={outcomeForMarket}
                    summaries={orderBookSummaries}
                    isLoadingSummaries={shouldShowOrderBookLoader}
                    lastPriceOverrideCents={lastPriceOverrideCents}
                  />
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
