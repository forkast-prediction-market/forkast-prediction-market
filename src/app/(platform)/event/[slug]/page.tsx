import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import EventContent from '@/app/(platform)/event/[slug]/_components/EventContent'
import { loadMarketContextSettings } from '@/lib/ai/market-context-config'
import { EventRepository } from '@/lib/db/queries/event'
import { UserRepository } from '@/lib/db/queries/user'

export async function generateMetadata({ params }: PageProps<'/event/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const { data } = await EventRepository.getEventTitleBySlug(slug)

  return {
    title: data?.title,
  }
}

export default async function EventPage({ params }: PageProps<'/event/[slug]'>) {
  const user = await UserRepository.getCurrentUser()
  const { slug } = await params
  const marketContextSettings = await loadMarketContextSettings()
  const marketContextEnabled = marketContextSettings.enabled && Boolean(marketContextSettings.apiKey)

  const { data: event, error } = await EventRepository.getEventBySlug(slug, user?.id ?? '')
  if (error || !event) {
    notFound()
  }

  return (
    <EventContent
      event={event}
      user={user}
      marketContextEnabled={marketContextEnabled}
      key={`is-bookmarked-${event.is_bookmarked}`}
    />
  )
}
