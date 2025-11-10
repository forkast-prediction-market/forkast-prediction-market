interface EventOrderPanelUserSharesProps {
  yesShares: number
  noShares: number
}

export default function EventOrderPanelUserShares({ yesShares, noShares }: EventOrderPanelUserSharesProps) {
  return (
    <div className="mb-4 flex gap-2">
      <div className="flex-1 text-center">
        {yesShares > 0
          ? (
              <span className="text-xs text-muted-foreground">
                {yesShares}
                {' '}
                shares
              </span>
            )
          : (
              <span className="text-xs text-muted-foreground opacity-50">
                No shares
              </span>
            )}
      </div>
      <div className="flex-1 text-center">
        {noShares > 0
          ? (
              <span className="text-xs text-muted-foreground">
                {noShares}
                {' '}
                shares
              </span>
            )
          : (
              <span className="text-xs text-muted-foreground opacity-50">
                No shares
              </span>
            )}
      </div>
    </div>
  )
}
