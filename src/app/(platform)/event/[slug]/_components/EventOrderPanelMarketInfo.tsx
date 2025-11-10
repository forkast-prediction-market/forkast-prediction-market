import type { Market } from '@/types'
import Image from 'next/image'

interface EventOrderPanelMarketInfoProps {
  market: Market | null
}

export default function EventOrderPanelMarketInfo({ market }: EventOrderPanelMarketInfoProps) {
  if (!market) {
    return <></>
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <Image
          src={market.icon_url}
          alt={market.title}
          width={42}
          height={42}
          className="shrink-0 rounded-sm"
        />
        <span className="text-sm font-bold">
          {market.short_title || market.title}
        </span>
      </div>
    </div>
  )
}
