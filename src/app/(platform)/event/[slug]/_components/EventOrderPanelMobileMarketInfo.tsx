import Image from 'next/image'
import { useBalance } from '@/hooks/useBalance'
import { useIsBinaryMarket, useOrder } from '@/stores/useOrder'

export default function EventOrderPanelMobileMarketInfo() {
  const state = useOrder()
  const isBinaryMarket = useIsBinaryMarket()
  const { balance } = useBalance()

  if (!state.event || !state.market) {
    return <></>
  }

  return (
    <div className="mb-4 flex items-center gap-3">
      <Image
        src={state.market.icon_url}
        alt={state.market.title}
        width={32}
        height={32}
        className="shrink-0 rounded"
      />
      <div className="flex-1">
        <div className="line-clamp-2 text-sm font-medium">
          {state.event.title}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {!isBinaryMarket && <span>{state.market.short_title || state.market.title}</span>}
          <span>
            Bal. $
            {balance.text}
          </span>
        </div>
      </div>
    </div>
  )
}
