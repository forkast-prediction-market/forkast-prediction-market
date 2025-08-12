import type { Event } from '@/types'
import EventCard from '@/components/event/EventCard'
import { OpenCardProvider } from '@/components/event/EventOpenCardContext'
import EventsEmptyState from '@/components/event/EventsEmptyState'
import { listEvents } from '@/lib/db/events'

interface EventsContentProps {
  category: string
  search: string
}

export default async function EventsGrid({ category, search }: EventsContentProps) {
  const events = await listEvents(category, search)

  if (events.length === 0) {
    return <EventsEmptyState activeCategory={category} searchQuery={search} />
  }

  return (
    <OpenCardProvider>
      {events.map((event: Event) => <EventCard key={event.id} event={event} />)}
    </OpenCardProvider>
  )
}
