import type { Event } from '@/types'
import { RefreshCwIcon, Triangle } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useTransition } from 'react'
import { refreshMarketSnapshotAction } from '@/app/(platform)/event/[slug]/_actions/refresh-market-snapshot'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ORDER_SIDE, OUTCOME_INDEX } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useIsBinaryMarket, useOrder } from '@/stores/useOrder'

interface EventMarketsProps {
  event: Event
}

export default function EventMarkets({ event }: EventMarketsProps) {
  const state = useOrder()
  const isBinaryMarket = useIsBinaryMarket()
  const router = useRouter()
  const [isRefreshing, startTransition] = useTransition()

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

  const totalProbability = useMemo(
    () => event.markets.reduce(
      (sum, market) => sum + (Number.isFinite(market.probability) ? market.probability : 0),
      0,
    ),
    [event.markets],
  )

  if (isBinaryMarket) {
    return <></>
  }

  function getYesOutcome(market: Event['markets'][number]) {
    return market.outcomes.find(outcome => outcome.outcome_index === OUTCOME_INDEX.YES)
      ?? market.outcomes[0]
  }

  function getDisplayProbability(market: Event['markets'][number]) {
    if (totalProbability > 0) {
      return (market.probability / totalProbability) * 100
    }
    return market.probability
  }

  function formatProbability(value: number) {
    if (!Number.isFinite(value)) {
      return '0'
    }

    return Math.round(value).toString()
  }

  function getProbabilityChange(market: Event['markets'][number]) {
    const yesOutcome = getYesOutcome(market)
    if (!yesOutcome?.recent_trades || yesOutcome.recent_trades.length < 2) {
      return 0
    }

    const [latest, previous] = [...yesOutcome.recent_trades]
      .sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
      .slice(0, 2)

    if (!latest || !previous) {
      return 0
    }

    return (latest.price - previous.price) * 100
  }

  function renderChangeIndicator(market: Event['markets'][number], size: 'sm' | 'lg') {
    const change = getProbabilityChange(market)
    const hasMovement = Math.abs(change) >= 0.01

    if (!hasMovement) {
      return null
    }

    const isPositive = change > 0
    const value = Math.round(Math.abs(change))
    const containerClass = size === 'lg'
      ? 'flex items-center gap-1 text-xs font-semibold'
      : 'flex items-center gap-1 text-[10px] font-semibold'

    return (
      <span className={cn(containerClass, isPositive ? 'text-yes' : 'text-no')}>
        <Triangle
          className={cn(size === 'lg' ? 'size-3' : 'size-2.5', isPositive ? '' : 'rotate-180')}
          fill="currentColor"
          strokeWidth={0}
        />
        {value}
        %
      </span>
    )
  }

  function refreshSnapshot() {
    startTransition(async () => {
      const response = await refreshMarketSnapshotAction({ slug: event.slug })
      if (!response?.error) {
        router.refresh()
      }
    })
  }

  return (
    <div className="-mx-4 overflow-hidden bg-background lg:mx-0">
      <div className="hidden items-center rounded-t-lg border-b py-3 lg:flex">
        <div className="w-1/2">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            OUTCOMES
          </span>
        </div>
        <div className="flex w-1/5 items-center gap-2">
          <span className="text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            CHANCE
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  `
                    flex size-6 items-center justify-center rounded border border-border/60 text-muted-foreground
                    transition-colors
                  `,
                  `
                    hover:text-foreground
                    focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none
                  `,
                )}
                onClick={refreshSnapshot}
                disabled={isRefreshing}
                aria-label="Refresh chance"
              >
                <RefreshCwIcon className={cn('size-3', isRefreshing ? 'animate-spin' : '')} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <span>Refresh</span>
            </TooltipContent>
          </Tooltip>
        </div>
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
              flex cursor-pointer flex-col items-start p-4 transition-all duration-200 ease-in-out
              hover:bg-black/5
              lg:flex-row lg:items-center
              dark:hover:bg-white/5
            `)}
            onClick={() => {
              state.setMarket(market)
              state.setSide(ORDER_SIDE.BUY)
            }}
          >
            {/* Mobile layout */}
            <div className="w-full lg:hidden">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {event.show_market_icons && (
                    <Image
                      src={market.icon_url}
                      alt={market.title}
                      width={42}
                      height={42}
                      className="flex-shrink-0 rounded-full"
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
                <div className="flex flex-col items-start">
                  <span className="text-lg font-bold text-foreground">
                    {formatProbability(getDisplayProbability(market))}
                    %
                  </span>
                  {renderChangeIndicator(market, 'sm')}
                </div>
              </div>

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
                  <span className="truncate">
                    Buy
                    {' '}
                    {market.outcomes[0].outcome_text}
                  </span>
                  <span className="shrink-0 text-base font-bold">
                    {Math.round(market.probability)}
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
                  <span className="truncate text-muted-foreground">
                    Buy
                    {' '}
                    {market.outcomes[1].outcome_text}
                  </span>
                  <span className="shrink-0 text-base font-bold">
                    {100 - Math.round(market.probability)}
                    ¢
                  </span>
                </Button>
              </div>
            </div>

            {/* Desktop layout */}
            <div className="hidden w-full items-center lg:flex">
              <div className="flex w-1/2 items-center gap-3">
                {event.show_market_icons && (
                  <Image
                    src={market.icon_url}
                    alt={market.title}
                    width={42}
                    height={42}
                    className="flex-shrink-0 rounded-full"
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

              <div className="flex w-1/5 items-center justify-center gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatProbability(getDisplayProbability(market))}
                  %
                </span>
                {renderChangeIndicator(market, 'lg')}
              </div>

              <div className="ml-auto flex items-center gap-2">
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
                    {Math.round(market.probability)}
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
                  <span className="truncate">
                    Buy
                    {' '}
                    {market.outcomes[1].outcome_text}
                  </span>
                  <span className="shrink-0 text-base font-bold">
                    {100 - Math.round(market.probability)}
                    ¢
                  </span>
                </Button>
              </div>
            </div>
          </div>
        ))}
    </div>
  )
}
