import type { Event } from '@/types'
import EventBookmark from '@/app/[locale]/(platform)/event/[slug]/_components/EventBookmark'
import { NewBadge } from '@/components/ui/new-badge'
import { formatVolume } from '@/lib/formatters'

interface EventCardFooterProps {
  event: Event
  hasRecentMarket: boolean
  resolvedVolume: number
  isInTradingMode: boolean
}

export default function EventCardFooter({
  event,
  hasRecentMarket,
  resolvedVolume,
  isInTradingMode,
}: EventCardFooterProps) {
  if (isInTradingMode) {
    return null
  }

  return (
    <div className="mt-0 flex items-center justify-between gap-2 text-xs leading-tight text-muted-foreground">
      <div className="flex items-center gap-2">
        {hasRecentMarket
          ? <NewBadge />
          : (
              <span>
                {formatVolume(resolvedVolume)}
                {' '}
                Vol.
              </span>
            )}
      </div>
      <EventBookmark event={event} />
    </div>
  )
}
