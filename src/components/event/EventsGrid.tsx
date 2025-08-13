import type { Event } from '@/types'
import EventCard from '@/components/event/EventCard'
import { OpenCardProvider } from '@/components/event/EventOpenCardContext'
import EventsEmptyState from '@/components/event/EventsEmptyState'
import { listEvents } from '@/lib/db/events'

interface EventsContentProps {
  tag: string
  search: string
}

export default async function EventsGrid({ tag, search }: EventsContentProps) {
  const events = await listEvents(tag, search)

  if (events.length === 0) {
    return <EventsEmptyState tag={tag} searchQuery={search} />
  }

  return (
    <OpenCardProvider>
      {events.map((event: Event) => <EventCard key={event.id} event={event} />)}
    </OpenCardProvider>
  )
}
