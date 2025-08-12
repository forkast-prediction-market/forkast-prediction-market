import EventsEmptyState from '@/components/event/EventsEmptyState'
import EventsGrid from '@/components/event/EventsGrid'
import { listEvents } from '@/lib/db/events'

interface EventsContentProps {
  category: string
  search: string
}

export default async function EventsContent({ category, search }: EventsContentProps) {
  const events = await listEvents(category, search)
  const favoriteMarkets = new Set<string>()

  if (events.length === 0) {
    return <EventsEmptyState activeCategory={category} searchQuery={search} />
  }

  return <EventsGrid events={events} favoriteMarkets={favoriteMarkets} />
}
