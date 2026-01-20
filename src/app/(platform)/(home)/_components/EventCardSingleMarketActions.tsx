import type { Market, Outcome } from '@/types'
import { Button } from '@/components/ui/button'

interface EventCardSingleMarketActionsProps {
  yesOutcome: Outcome
  noOutcome: Outcome
  primaryMarket: Market | undefined
  isLoading: boolean
  onTrade: (outcome: Outcome, market: Market, variant: 'yes' | 'no') => void
  onToggle: () => void
}

export default function EventCardSingleMarketActions({
  yesOutcome,
  noOutcome,
  primaryMarket,
  isLoading,
  onTrade,
  onToggle,
}: EventCardSingleMarketActionsProps) {
  if (!primaryMarket) {
    return null
  }

  return (
    <div className="mt-auto mb-3 grid grid-cols-2 gap-2">
      <Button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onTrade(yesOutcome, primaryMarket, 'yes')
          onToggle()
        }}
        disabled={isLoading}
        variant="yes"
        size="outcome"
      >
        <span className="truncate">{yesOutcome.outcome_text}</span>
      </Button>
      <Button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onTrade(noOutcome, primaryMarket, 'no')
          onToggle()
        }}
        disabled={isLoading}
        variant="no"
        size="outcome"
      >
        <span className="truncate">{noOutcome.outcome_text}</span>
      </Button>
    </div>
  )
}
