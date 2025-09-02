import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { EventModel } from '@/lib/db/events'
import { UserModel } from '@/lib/db/users'
import EventDetail from './_components/EventDetail'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { data } = await EventModel.getEventTitleBySlug(slug)

  return {
    title: data?.title,
  }
}

export default async function EventPage({ params }: PageProps) {
  const user = await UserModel.getCurrentUser()
  const { slug } = await params

  try {
    const { data: event, error } = await EventModel.getEventBySlug(slug, user?.id ?? '')
    if (error) {
      notFound()
    }

    return <EventDetail event={event} user={user} key={`is-bookmarked-${event.is_bookmarked}`} />
  }
  catch {
    notFound()
  }
}
