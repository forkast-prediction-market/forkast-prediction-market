import { OUTCOME_INDEX } from '@/lib/constants'
import { sharesFormatter } from '@/lib/formatters'

type ActiveOutcome = typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO | undefined

interface EventOrderPanelUserSharesProps {
  yesShares: number
  noShares: number
  activeOutcome?: ActiveOutcome
}

export default function EventOrderPanelUserShares({ yesShares, noShares, activeOutcome }: EventOrderPanelUserSharesProps) {
  const shouldShow = yesShares > 0 || noShares > 0
  if (!shouldShow) {
    return null
  }

  const formattedYesShares = formatShareValue(yesShares)
  const formattedNoShares = formatShareValue(noShares)
  const yesClass = activeOutcome === OUTCOME_INDEX.YES ? 'text-yes' : 'text-muted-foreground'
  const noClass = activeOutcome === OUTCOME_INDEX.NO ? 'text-no' : 'text-muted-foreground'

  return (
    <div className="mb-4 flex gap-2">
      <div className="flex-1 text-center">
        <span className={`text-xs font-semibold ${yesClass}`}>
          {formattedYesShares}
          {' '}
          shares
        </span>
      </div>
      <div className="flex-1 text-center">
        <span className={`text-xs font-semibold ${noClass}`}>
          {formattedNoShares}
          {' '}
          shares
        </span>
      </div>
    </div>
  )
}

function formatShareValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0'
  }

  const truncated = Math.floor(value * 100 + 1e-8) / 100
  return sharesFormatter.format(Math.max(0, truncated))
}
