import Image from 'next/image'
import { useOrder } from '@/stores/useOrder'

export default function EventOrderPanelMarketInfo() {
  const state = useOrder()

  if (!state.market) {
    return <></>
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <Image
          src={state.market.icon_url}
          alt={state.market.name}
          width={42}
          height={42}
          className="shrink-0 rounded-sm"
        />
        <span className="text-sm font-bold">
          {state.market.short_title || state.market.name}
        </span>
      </div>
    </div>
  )
}
