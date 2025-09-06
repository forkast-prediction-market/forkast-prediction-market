import { getNoShares, getYesShares, useOrder } from '@/stores/useOrder'

export default function EventOrderPanelUserShares() {
  const state = useOrder()

  if (!state.market) {
    return <></>
  }

  return (
    <div className="mb-4 flex gap-2">
      <div className="flex-1 text-center">
        {getYesShares(state.market.condition_id) > 0
          ? (
              <span className="text-xs text-muted-foreground">
                {getYesShares(state.market.condition_id)}
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
        {getNoShares(state.market.condition_id) > 0
          ? (
              <span className="text-xs text-muted-foreground">
                {getNoShares(state.market.condition_id)}
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
