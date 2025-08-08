import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import EventDetail from '@/components/event/EventDetail'
import { show } from '@/lib/db/events'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

async function getEvent(slug: string) {
  return cache(async (slug: string) => await show(slug))(slug)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEvent(slug)

  return {
    title: event.title,
  }
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params

  try {
    const event = await getEvent(slug)

    return <EventDetail event={event} />
  }
  catch {
    notFound()
  }
}
