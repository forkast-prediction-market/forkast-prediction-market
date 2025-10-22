import type { Event } from '@/types'
import { Clock3Icon } from 'lucide-react'
import { NewBadge } from '@/components/ui/new-badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate, formatVolume, isMarketNew } from '@/lib/utils'

interface EventMetaInformationProps {
  event: Event
}

export default function EventMetaInformation({ event }: EventMetaInformationProps) {
  const hasRecentMarket = event.markets.some(
    market => isMarketNew(market.created_at),
  )
  const expiryTooltip = 'This is estimated end date.<br>See rules below for specific resolution details.'
  const volumeLabel = `Volume ${formatVolume(event.markets[0].total_volume)}`

  const maybeEndDate = event.end_date ? new Date(event.end_date) : null
  const expiryDate = maybeEndDate && !Number.isNaN(maybeEndDate.getTime()) ? maybeEndDate : null

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {hasRecentMarket
        ? (
            <NewBadge
              variant="soft"
              className="rounded-sm p-2"
            />
          )
        : <span>{volumeLabel}</span>}
      {!hasRecentMarket && expiryDate && <span>•</span>}
      {expiryDate && (
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1">
              <Clock3Icon className="size-3.5 text-muted-foreground" strokeWidth={2.5} />
              <span>{formatDate(expiryDate)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent collisionPadding={20}>
            <p dangerouslySetInnerHTML={{ __html: expiryTooltip! }} className="text-center" />
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
