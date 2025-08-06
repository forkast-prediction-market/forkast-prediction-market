import type { Event } from '@/types'
import { RefreshCwIcon, TrendingDownIcon } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

interface Props {
  event: Event
  tradingState: ReturnType<typeof import('@/hooks/useTradingState').useTradingState>
  setIsMobileModalOpen: (isOpen: boolean) => void
}

export default function EventMarkets({ event, tradingState, setIsMobileModalOpen }: Props) {
  if (event.active_markets_count <= 1) {
    return <></>
  }

  return (
    <div className="mt-6 overflow-hidden bg-background">
      <div
        className="hidden items-center rounded-t-lg border-b bg-muted/10 py-3 md:flex dark:border-border/20"
      >
        <div className="w-1/2">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            OUTCOMES
          </span>
        </div>
        <div className="flex w-3/5 items-center justify-center gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            CHANCE
          </span>
          <a
            href="#"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCwIcon className="h-3 w-3" />
          </a>
        </div>
        <div className="w-[24%]"></div>
        <div className="w-[24%]"></div>
      </div>

      {/* Items - Sorted by probability descending */}
      {[...event.outcomes]
        .sort((a, b) => b.probability - a.probability)
        .map((outcome, index, sortedOutcomes) => (
          <div
            key={outcome.id}
            className={`
              flex cursor-pointer flex-col items-start rounded-lg px-3 py-4 transition-all duration-200 ease-in-out
              hover:bg-black/5
              md:flex-row md:items-center md:px-2
              dark:hover:bg-white/5
              ${
          tradingState.selectedOutcomeForOrder === outcome.id
            ? 'bg-muted dark:bg-black/10'
            : ''
          } ${
            index !== sortedOutcomes.length - 1
              ? 'border-b border-border/50 dark:border-border/20'
              : 'rounded-b-lg'
          }`}
            onClick={() => {
              tradingState.setSelectedOutcomeForOrder(outcome.id)
              tradingState.setActiveTab('buy')
              tradingState.inputRef?.focus()
            }}
          >
            {/* Mobile: Layout in column */}
            <div className="w-full md:hidden">
              {/* Row 1: Name and probability */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {event.show_market_icons !== false && (
                    <Image
                      src={
                        outcome.avatar
                        || `https://avatar.vercel.sh/${outcome.name.toLowerCase()}.png`
                      }
                      alt={outcome.name}
                      width={42}
                      height={42}
                      className="flex-shrink-0 rounded-full"
                    />
                  )}
                  <div>
                    <div className="text-lg font-bold">
                      {outcome.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      $
                      {outcome.volume?.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || '0.00'}
                      {' '}
                      Vol.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {Math.round(outcome.probability)}
                    %
                  </span>
                  <div className="flex items-center gap-1 text-no">
                    <TrendingDownIcon className="h-3 w-3" />
                    <span className="text-xs font-semibold">3%</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Buttons */}
              <div className="flex gap-2">
                <Button
                  size="lg"
                  variant="yes"
                  className={`flex-1 ${tradingState.selectedOutcomeForOrder === outcome.id
                  && tradingState.yesNoSelection === 'yes'
                    ? 'bg-yes text-white'
                    : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    tradingState.setSelectedOutcomeForOrder(outcome.id)
                    tradingState.setYesNoSelection('yes')
                    tradingState.setActiveTab('buy')
                    setIsMobileModalOpen(true)
                  }}
                >
                  Buy Yes
                  {' '}
                  {Math.round(outcome.probability)}
                  ¢
                </Button>
                <Button
                  size="lg"
                  variant="no"
                  className={`flex-1 ${tradingState.selectedOutcomeForOrder === outcome.id
                  && tradingState.yesNoSelection === 'no'
                    ? 'bg-no text-white'
                    : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    tradingState.setSelectedOutcomeForOrder(outcome.id)
                    tradingState.setYesNoSelection('no')
                    tradingState.setActiveTab('buy')
                    setIsMobileModalOpen(true)
                  }}
                >
                  Buy No
                  {' '}
                  {100 - Math.round(outcome.probability)}
                  ¢
                </Button>
              </div>
            </div>

            {/* Desktop: Original line layout */}
            <div className="hidden w-full items-center md:flex">
              {/* First column: Name and info - 50% */}
              <div className="flex w-1/2 items-center gap-3">
                {event.show_market_icons !== false && (
                  <Image
                    src={
                      outcome.avatar
                      || `https://avatar.vercel.sh/${outcome.name.toLowerCase()}.png`
                    }
                    alt={outcome.name}
                    width={42}
                    height={42}
                    className="flex-shrink-0 rounded-full"
                  />
                )}
                <div>
                  <div className="text-lg font-bold">
                    {outcome.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    $
                    {outcome.volume?.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || '0.00'}
                    {' '}
                    Vol.
                  </div>
                </div>
              </div>

              {/* Second column: Probability - 20% */}
              <div className="flex w-3/5 justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-bold text-foreground">
                    {Math.round(outcome.probability)}
                    %
                  </span>
                  <div className="flex items-center gap-1 text-no">
                    <TrendingDownIcon className="h-3 w-3" />
                    <span className="text-xs font-semibold">3%</span>
                  </div>
                </div>
              </div>

              {/* Third column: Yes button - 15% */}
              <div className="ml-3 w-[15%]">
                <Button
                  size="lg"
                  variant="yes"
                  className={tradingState.selectedOutcomeForOrder === outcome.id
                    && tradingState.yesNoSelection === 'yes'
                    ? 'bg-yes text-white'
                    : ''}
                  onClick={(e) => {
                    e.stopPropagation()
                    tradingState.setSelectedOutcomeForOrder(outcome.id)
                    tradingState.setYesNoSelection('yes')
                    tradingState.setActiveTab('buy')
                    tradingState.inputRef?.focus()
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span>
                      Buy Yes
                      {' '}
                      {Math.round(outcome.probability)}
                      ¢
                    </span>
                  </div>
                </Button>
              </div>
              <div className="ml-2 w-[15%]">
                <Button
                  size="lg"
                  variant="no"
                  className={tradingState.selectedOutcomeForOrder === outcome.id
                    && tradingState.yesNoSelection === 'no'
                    ? 'bg-no text-white'
                    : ''}
                  onClick={(e) => {
                    e.stopPropagation()
                    tradingState.setSelectedOutcomeForOrder(outcome.id)
                    tradingState.setYesNoSelection('no')
                    tradingState.setActiveTab('buy')
                    tradingState.inputRef?.focus()
                  }}
                >
                  <div className="flex flex-col items-center">
                    <span>
                      Buy No
                      {' '}
                      {100 - Math.round(outcome.probability)}
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
