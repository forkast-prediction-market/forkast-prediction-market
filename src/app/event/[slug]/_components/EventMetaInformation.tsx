import type { Event } from '@/types'
import { formatDate, formatVolume } from '@/lib/utils'

interface EventMetaInformationProps {
  event: Event
}

export default function EventMetaInformation({ event }: EventMetaInformationProps) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span>
        Volume
        {' '}
        {formatVolume(event.markets[0].total_volume)}
      </span>
      <span>•</span>
      <span>
        Expires
        {' '}
        {formatDate(new Date(event.created_at))}
      </span>
    </div>
  )
}
