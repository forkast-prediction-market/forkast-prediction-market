'use cache'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventBySlug } from '@/lib/db/events'
import EventDetail from './_components/EventDetail'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)

  return {
    title: event.title,
  }
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params

  try {
    const event = await getEventBySlug(slug)

    return <EventDetail event={event} />
  }
  catch {
    notFound()
  }
}
