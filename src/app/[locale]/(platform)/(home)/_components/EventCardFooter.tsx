import type { Event } from '@/types'
import EventBookmark from '@/app/[locale]/(platform)/event/[slug]/_components/EventBookmark'
import { NewBadge } from '@/components/ui/new-badge'
import { formatVolume } from '@/lib/formatters'

interface EventCardFooterProps {
  event: Event
  hasRecentMarket: boolean
  resolvedVolume: number
  isInTradingMode: boolean
  endedLabel?: string | null
}

export default function EventCardFooter({
  event,
  hasRecentMarket,
  resolvedVolume,
  isInTradingMode,
  endedLabel,
}: EventCardFooterProps) {
  if (isInTradingMode) {
    return null
  }

  const isResolvedEvent = event.status === 'resolved'

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
      {isResolvedEvent
        ? (endedLabel
            ? <span className="text-sm text-muted-foreground">{endedLabel}</span>
            : null)
        : <EventBookmark event={event} />}
    </div>
  )
}
