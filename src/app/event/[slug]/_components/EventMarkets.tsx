import type { Event } from '@/types'
import { RefreshCwIcon, TrendingDownIcon } from 'lucide-react'
import Image from 'next/image'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useIsBinaryMarket, useOrder } from '@/stores/useOrder'

interface EventMarketsProps {
  event: Event
}

export default function EventMarkets({ event }: EventMarketsProps) {
  const state = useOrder()
  const isBinaryMarket = useIsBinaryMarket()

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

  if (isBinaryMarket) {
    return <></>
  }

  return (
    <div className="mt-6 overflow-hidden bg-background">
      <div
        className="hidden items-center rounded-t-lg border-b py-3 md:flex"
      >
        <div className="w-1/2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            OUTCOMES
          </span>
        </div>
        <div className="flex w-3/5 items-center justify-center gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            CHANCE
          </span>
          <a
            href="#"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCwIcon className="size-3" />
          </a>
        </div>
        <div className="w-[24%]"></div>
        <div className="w-[24%]"></div>
      </div>

      {[...event.markets]
        .sort((a, b) => b.probability - a.probability)
        .map((market, index, sortedMarkets) => (
          <div
            key={market.condition_id}
            className={cn({
              'bg-muted dark:bg-black/10': state.market?.condition_id === market.condition_id,
              'border-b': index !== sortedMarkets.length - 1,
            }, `
              flex cursor-pointer flex-col items-start px-3 py-4 transition-all duration-200 ease-in-out
              hover:bg-black/5
              md:flex-row md:items-center md:px-2
              dark:hover:bg-white/5
            `)}
            onClick={() => {
              state.setMarket(market)
              state.setActiveTab('buy')
              state.inputRef?.focus()
            }}
          >
            {/* Mobile: Layout in column */}
            <div className="w-full md:hidden">
              {/* Row 1: Name and probability */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {event.show_market_icons && (
                    <Image
                      src={market.icon_url}
                      alt={market.name}
                      width={42}
                      height={42}
                      className="flex-shrink-0 rounded-full"
                    />
                  )}
                  <div>
                    <div className="text-xs font-bold">
                      {market.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
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
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">
                    {Math.round(market.probability)}
                    %
                  </span>
                  <div className="flex items-center gap-1 text-no">
                    <TrendingDownIcon className="size-3" />
                    <span className="text-xs font-semibold">3%</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Buttons */}
              <div className="flex gap-2">
                <Button
                  size="lg"
                  variant="yes"
                  className={cn({
                    'bg-yes text-white': state.market?.condition_id === market.condition_id && state.outcome?.outcome_index === 0,
                  }, 'flex-1')}
                  onClick={(e) => {
                    e.stopPropagation()
                    state.setMarket(market)
                    state.setOutcome(market.outcomes[0])
                    state.setActiveTab('buy')
                    state.setIsMobileOrderPanelOpen(true)
                  }}
                >
                  Buy Yes
                  {' '}
                  {Math.round(market.probability)}
                  ¢
                </Button>
                <Button
                  size="lg"
                  variant="no"
                  className={cn({
                    'bg-no text-white': state.market?.condition_id === market.condition_id && state.outcome?.outcome_index === 1,
                  }, 'flex-1')}
                  onClick={(e) => {
                    e.stopPropagation()
                    state.setMarket(market)
                    state.setOutcome(market.outcomes[1])
                    state.setActiveTab('buy')
                    state.setIsMobileOrderPanelOpen(true)
                  }}
                >
                  Buy No
                  {' '}
                  {100 - Math.round(market.probability)}
                  ¢
                </Button>
              </div>
            </div>

            {/* Desktop: Original line layout */}
            <div className="hidden w-full items-center md:flex">
              {/* First column: Name and info - 50% */}
              <div className="flex w-1/2 items-center gap-3">
                {event.show_market_icons && (
                  <Image
                    src={market.icon_url}
                    alt={market.name}
                    width={42}
                    height={42}
                    className="flex-shrink-0 rounded-full"
                  />
                )}
                <div>
                  <div className="font-bold">
                    {market.name}
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

              {/* Second column: Probability - 20% */}
              <div className="flex w-2/5 justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {Math.round(market.probability)}
                    %
                  </span>
                  <div className="flex items-center gap-1 text-no">
                    <TrendingDownIcon className="size-3" />
                    <span className="text-xs font-semibold">3%</span>
                  </div>
                </div>
              </div>

              {/* Third column: Yes button - 15% */}
              <div className="ml-3 w-[15%]">
                <Button
                  size="lg"
                  variant="yes"
                  className={cn({
                    'bg-yes text-white': state.market?.condition_id === market.condition_id && state.outcome?.outcome_index === 0,
                  }, 'w-32')}
                  onClick={(e) => {
                    e.stopPropagation()
                    state.setMarket(market)
                    state.setOutcome(market.outcomes[0])
                    state.setActiveTab('buy')
                    state.inputRef?.focus()
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span>
                      Buy Yes
                      {' '}
                      {Math.round(market.probability)}
                      ¢
                    </span>
                  </div>
                </Button>
              </div>
              <div className="ml-2 w-[15%]">
                <Button
                  size="lg"
                  variant="no"
                  className={cn({
                    'bg-no text-white': state.market?.condition_id === market.condition_id && state.outcome?.outcome_index === 1,
                  }, 'w-32')}
                  onClick={(e) => {
                    e.stopPropagation()
                    state.setMarket(market)
                    state.setOutcome(market.outcomes[1])
                    state.setActiveTab('buy')
                    state.inputRef?.focus()
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span>
                      Buy No
                      {' '}
                      {100 - Math.round(market.probability)}
                      ¢
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        ))}
    </div>
  )
}
