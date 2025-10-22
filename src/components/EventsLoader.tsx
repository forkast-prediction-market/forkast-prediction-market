import EventsEmptyState from '@/app/(platform)/event/[slug]/_components/EventsEmptyState'
import { OpenCardProvider } from '@/components/EventOpenCardContext'
import EventsGrid from '@/components/EventsGrid'
import { EventRepository } from '@/lib/db/queries/event'
import { UserRepository } from '@/lib/db/queries/user'

interface EventsLoaderProps {
  tag: string
  search: string
  bookmarked: string
}

export default async function EventsLoader({ tag, search, bookmarked }: EventsLoaderProps) {
  const user = await UserRepository.getCurrentUser()
  const { data: events, error } = await EventRepository.listEvents({
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
