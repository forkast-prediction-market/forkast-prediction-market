import EventsEmptyState from '@/app/(platform)/event/[slug]/_components/EventsEmptyState'
import { OpenCardProvider } from '@/components/event/EventOpenCardContext'
import EventsGrid from '@/components/event/EventsGrid'
import { EventModel } from '@/lib/db/events'
import { UserModel } from '@/lib/db/users'

interface EventsLoaderProps {
  tag: string
  search: string
  bookmarked: string
}

export default async function EventsLoader({ tag, search, bookmarked }: EventsLoaderProps) {
  const user = await UserModel.getCurrentUser()
  const { data: events, error } = await EventModel.listEvents({
    tag,
    search,
    userId: user?.id,
    bookmarked: bookmarked === 'true',
  })

  if (error) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Could not load more events.
      </p>
    )
  }

  if (!events || events.length === 0) {
    return <EventsEmptyState tag={tag} searchQuery={search} />
  }

  return (
    <OpenCardProvider>
      <EventsGrid tag={tag} search={search} bookmarked={bookmarked} initialEvents={events} />
    </OpenCardProvider>
  )
}
