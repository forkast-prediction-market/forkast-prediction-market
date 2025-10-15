import type { Event } from '@/types'
import { Clock3Icon } from 'lucide-react'
import { NewBadge } from '@/components/ui/new-badge'
import { formatDate, formatVolume, isMarketNew } from '@/lib/utils'

interface EventMetaInformationProps {
  event: Event
}

export default function EventMetaInformation({ event }: EventMetaInformationProps) {
  const hasRecentMarket = event.markets.some(
    market => isMarketNew(market.created_at),
  )
  const expiryTooltip = 'This is estimated end date. See rules below for specific resolution details.'
  const volumeLabel = `Volume ${formatVolume(event.markets[0].total_volume)}`

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {hasRecentMarket
        ? (
            <NewBadge
              variant="soft"
              className="rounded-sm px-2 py-2"
            />
          )
        : (
            <span>{volumeLabel}</span>
          )}
      {!hasRecentMarket && <span>•</span>}
      <div
        className="flex items-center gap-1"
        title={expiryTooltip}
      >
        <Clock3Icon className="size-3.5 text-muted-foreground" strokeWidth={2.5} />
        <span>{formatDate(new Date(event.created_at))}</span>
      </div>
    </div>
  )
}
