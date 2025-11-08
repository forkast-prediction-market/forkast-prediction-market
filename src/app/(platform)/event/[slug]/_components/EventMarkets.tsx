import type { Event } from '@/types'
import { RefreshCwIcon, TrendingDownIcon } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import EventOrderBook from '@/app/(platform)/event/[slug]/_components/EventOrderBook'
import { Button } from '@/components/ui/button'
import { ORDER_SIDE, OUTCOME_INDEX } from '@/lib/constants'
import { cn, toCents } from '@/lib/utils'
import { useIsBinaryMarket, useOrder } from '@/stores/useOrder'

interface EventMarketsProps {
  event: Event
}

export default function EventMarkets({ event }: EventMarketsProps) {
  const state = useOrder()
  const isBinaryMarket = useIsBinaryMarket()
  const [expandedMarketId, setExpandedMarketId] = useState<string | null>(null)

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

  if (isBinaryMarket) {
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
          <a
            href="#"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCwIcon className="size-3" />
          </a>
        </div>
      </div>

      {[...event.markets]
        .sort((a, b) => b.probability - a.probability)
        .map((market, index, sortedMarkets) => {
          const isExpanded = expandedMarketId === market.condition_id
          const outcomeForMarket = state.outcome && state.outcome.condition_id === market.condition_id
            ? state.outcome
            : market.outcomes[0]

          function handleToggle() {
            const currentlyExpanded = expandedMarketId === market.condition_id
            setExpandedMarketId(currentlyExpanded ? null : market.condition_id)
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
                    <span className="text-lg font-bold text-foreground">
                      {Math.round(market.probability)}
                      %
                    </span>
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
                        {toCents(market.outcomes[0].buy_price)}
                        ¢
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
                        {toCents(market.outcomes[1].buy_price)}
                        ¢
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
                      <span className="text-3xl font-bold text-foreground">
                        {Math.round(market.probability)}
                        %
                      </span>
                      <div className="flex items-center gap-1 text-no">
                        <TrendingDownIcon className="size-3" />
                        <span className="text-xs font-semibold">3%</span>
                      </div>
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
                        {toCents(market.outcomes[0].buy_price)}
                        ¢
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
                        {toCents(market.outcomes[1].buy_price)}
                        ¢
                      </span>
                    </Button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="pt-2">
                  <EventOrderBook market={market} outcome={outcomeForMarket} />
                </div>
              )}

              {index !== sortedMarkets.length - 1 && (
                <div className="mx-2 border-b border-border" />
              )}
            </div>
          )
        })}
    </div>
  )
}
