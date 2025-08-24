import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventBySlug, getEventTitleBySlug } from '@/lib/db/events'
import { getCurrentUser } from '@/lib/db/users'
import EventDetail from './_components/EventDetail'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const title = await getEventTitleBySlug(slug)

  return {
    title,
  }
}

export default async function EventPage({ params }: PageProps) {
  const user = await getCurrentUser()
  const { slug } = await params

  try {
    const event = await getEventBySlug(slug, Number.parseInt(user?.id ?? '0'))

    return <EventDetail event={event} />
  }
  catch {
    notFound()
  }
}
