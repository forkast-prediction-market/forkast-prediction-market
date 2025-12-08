import { sharesFormatter } from '@/lib/formatters'

interface EventOrderPanelUserSharesProps {
  yesShares: number
  noShares: number
}

export default function EventOrderPanelUserShares({ yesShares, noShares }: EventOrderPanelUserSharesProps) {
  const formattedYesShares = sharesFormatter.format(Math.max(0, yesShares))
  const formattedNoShares = sharesFormatter.format(Math.max(0, noShares))

  return (
    <div className="mb-4 flex gap-2">
      <div className="flex-1 text-center">
        <span className="text-xs text-muted-foreground">
          {formattedYesShares}
          {' '}
          shares
        </span>
      </div>
      <div className="flex-1 text-center">
        <span className="text-xs text-muted-foreground">
          {formattedNoShares}
          {' '}
          shares
        </span>
      </div>
    </div>
  )
}
