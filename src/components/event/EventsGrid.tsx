import EventsEmptyState from '@/app/event/[slug]/_components/EventsEmptyState'
import EventCard from '@/components/event/EventCard'
import { OpenCardProvider } from '@/components/event/EventOpenCardContext'
import { EventModel } from '@/lib/db/events'
import { UserModel } from '@/lib/db/users'

interface EventsContentProps {
  tag: string
  search: string
  bookmarked: string
}

export default async function EventsGrid({ tag, search, bookmarked }: EventsContentProps) {
  const user = await UserModel.getCurrentUser()
  const { data: events, error } = await EventModel.listEvents({
    tag,
    search,
    userId: user?.id,
    bookmarked: bookmarked === 'true',
  })

  if (error) {
    return <></>
  }

  if (!events || events.length === 0) {
    return <EventsEmptyState tag={tag} searchQuery={search} />
  }

  return (
    <OpenCardProvider>
      {events.map(event => <EventCard key={event.id} event={event} />)}
    </OpenCardProvider>
  )
}
