import type { Event } from '@/types'
import EventsEmptyState from '@/app/event/[slug]/_components/EventsEmptyState'
import EventCard from '@/components/event/EventCard'
import { OpenCardProvider } from '@/components/event/EventOpenCardContext'
import { listEvents } from '@/lib/db/events'
import { getCurrentUser } from '@/lib/db/users'

interface EventsContentProps {
  tag: string
  search: string
}

export default async function EventsGrid({ tag, search }: EventsContentProps) {
  const user = await getCurrentUser()
  const events = await listEvents(tag, search, Number.parseInt(user?.id ?? '0'))

  if (events.length === 0) {
    return <EventsEmptyState tag={tag} searchQuery={search} />
  }

  return (
    <OpenCardProvider>
      {events.map((event: Event) => <EventCard key={event.id} event={event} />)}
    </OpenCardProvider>
  )
}
