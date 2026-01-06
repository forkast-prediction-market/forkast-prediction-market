import type { Event, Market, Outcome } from '@/types'
import { Button } from '@/components/ui/button'

interface EventCardMarketsListProps {
  event: Event
  getDisplayChance: (marketId: string) => number
  onTrade: (outcome: Outcome, market: Market, variant: 'yes' | 'no') => void
  onToggle: () => void
}

export default function EventCardMarketsList({
  event,
  getDisplayChance,
  onTrade,
  onToggle,
}: EventCardMarketsListProps) {
  return (
    <div className="mt-auto mb-1 scrollbar-hide max-h-14 space-y-2 overflow-y-auto">
      {event.markets.map(market => (
        <div
          key={market.condition_id}
          className="flex items-center justify-between"
        >
          <p
            className="truncate text-[13px] font-medium dark:text-white"
            title={market.short_title || market.title}
          >
            {market.short_title || market.title}
          </p>
          <div className="ml-2 flex items-center gap-2">
            {(() => {
              const displayChance = Math.round(getDisplayChance(market.condition_id))
              const oppositeChance = Math.max(0, Math.min(100, 100 - displayChance))
              return (
                <>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {displayChance}
                    %
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onTrade(market.outcomes[0], market, 'yes')
                        onToggle()
                      }}
                      title={`${market.outcomes[0].outcome_text}: ${displayChance}%`}
                      variant="yes"
                      className="group h-auto w-11 px-2 py-1 text-xs"
                    >
                      <span className="truncate group-hover:hidden">
                        {market.outcomes[0].outcome_text}
                      </span>
                      <span className="hidden font-mono group-hover:inline">
                        {displayChance}
                        %
                      </span>
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onTrade(market.outcomes[1], market, 'no')
                        onToggle()
                      }}
                      title={`${market.outcomes[1].outcome_text}: ${oppositeChance}%`}
                      variant="no"
                      size="sm"
                      className="group h-auto w-11 px-2 py-1 text-xs"
                    >
                      <span className="truncate group-hover:hidden">
                        {market.outcomes[1].outcome_text}
                      </span>
                      <span className="hidden font-mono group-hover:inline">
                        {oppositeChance}
                        %
                      </span>
                    </Button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      ))}
    </div>
  )
}
