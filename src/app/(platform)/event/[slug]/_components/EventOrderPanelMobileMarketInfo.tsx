import type { Event, Market } from '@/types'
import Image from 'next/image'

interface EventOrderPanelMobileMarketInfoProps {
  event: Event
  market: Market | null
  isSingleMarket: boolean
  balanceText: string
}

export default function EventOrderPanelMobileMarketInfo({
  event,
  market,
  isSingleMarket,
  balanceText,
}: EventOrderPanelMobileMarketInfoProps) {
  if (!market) {
    return <></>
  }

  return (
    <div className="mb-4 flex items-center gap-3">
      <Image
        src={market.icon_url}
        alt={market.title}
        width={32}
        height={32}
        className="shrink-0 rounded"
      />
      <div className="flex-1">
        <div className="line-clamp-2 text-sm font-medium">
          {event.title}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {!isSingleMarket && <span>{market.short_title || market.title}</span>}
          <span>
            Bal. $
            {balanceText}
          </span>
        </div>
      </div>
    </div>
  )
}
