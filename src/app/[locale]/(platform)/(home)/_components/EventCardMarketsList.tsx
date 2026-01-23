import type { Event, Market, Outcome } from '@/types'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OUTCOME_INDEX } from '@/lib/constants'
import { Link } from '@/i18n/navigation'

interface EventCardMarketsListProps {
  event: Event
  isResolvedEvent: boolean
  getDisplayChance: (marketId: string) => number
  onTrade: (outcome: Outcome, market: Market, variant: 'yes' | 'no') => void
  onToggle: () => void
}

export default function EventCardMarketsList({
  event,
  isResolvedEvent,
  getDisplayChance,
  onTrade,
  onToggle,
}: EventCardMarketsListProps) {
  return (
    <div className="mb-1 scrollbar-hide max-h-16 space-y-2 overflow-y-auto">
      {event.markets.map((market) => {
        const resolvedOutcome = isResolvedEvent
          ? market.outcomes.find(outcome => outcome.is_winning_outcome)
          : null
        const resolvedLabel = resolvedOutcome?.outcome_text
        const isYesOutcome = resolvedOutcome?.outcome_index === OUTCOME_INDEX.YES

        return (
          <div
            key={market.condition_id}
            className="flex items-center justify-between"
          >
            <Link
              href={`/event/${event.slug}/${market.slug}`}
              className={`
                block min-w-0 flex-1 truncate text-[13px] font-medium underline-offset-2
                hover:underline
                dark:text-white
              `}
              title={market.short_title || market.title}
            >
              {market.short_title || market.title}
            </Link>
            <div className="ml-2 flex items-center gap-2">
              {isResolvedEvent
                ? (
                    resolvedOutcome
                      ? (
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className={`flex size-4 items-center justify-center rounded-full ${isYesOutcome
                              ? `bg-yes`
                              : `bg-no`}`}
                            >
                              {isYesOutcome
                                ? <Check className="size-3 text-background" strokeWidth={2.5} />
                                : <X className="size-3 text-background" strokeWidth={2.5} />}
                            </span>
                            <span className="min-w-8 text-left">{resolvedLabel}</span>
                          </span>
                        )
                      : (
                          <span className="text-sm font-semibold text-muted-foreground">Resolved</span>
                        )
                  )
                : (
                    (() => {
                      const displayChance = Math.round(getDisplayChance(market.condition_id))
                      const oppositeChance = Math.max(0, Math.min(100, 100 - displayChance))
                      return (
                        <>
                          <span className="text-base font-extrabold text-foreground">
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
                              variant="yes"
                              className="group h-7 w-10 px-2 py-1 text-xs"
                            >
                              <span className="truncate group-hover:hidden">
                                {market.outcomes[0].outcome_text}
                              </span>
                              <span className="hidden group-hover:inline">
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
                              variant="no"
                              size="sm"
                              className="group h-auto w-11 px-2 py-1 text-xs"
                            >
                              <span className="truncate group-hover:hidden">
                                {market.outcomes[1].outcome_text}
                              </span>
                              <span className="hidden group-hover:inline">
                                {oppositeChance}
                                %
                              </span>
                            </Button>
                          </div>
                        </>
                      )
                    })()
                  )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
