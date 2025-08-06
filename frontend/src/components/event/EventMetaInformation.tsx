import type { Event } from '@/types'
import { formatDate, formatVolume } from '@/lib/mockData'

interface Props {
  event: Event
}

export default function EventMetaInformation({ event }: Props) {
  return (
    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
      <span>
        Volume
        {' '}
        {formatVolume(event.volume)}
      </span>
      <span>•</span>
      <span>
        Expires
        {formatDate(event.endDate)}
      </span>
      <span>•</span>
      <span>{event.category}</span>
    </div>
  )
}
