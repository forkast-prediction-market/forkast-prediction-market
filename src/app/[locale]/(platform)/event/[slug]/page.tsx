import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import EventContent from '@/app/[locale]/(platform)/event/[slug]/_components/EventContent'
import { loadMarketContextSettings } from '@/lib/ai/market-context-config'
import { EventRepository } from '@/lib/db/queries/event'
import { UserRepository } from '@/lib/db/queries/user'

export async function generateMetadata({ params }: PageProps<'/[locale]/event/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const { data } = await EventRepository.getEventTitleBySlug(slug)

  return {
    title: data?.title,
  }
}

export default async function EventPage({ params }: PageProps<'/[locale]/event/[slug]'>) {
  const [user, { slug }, marketContextSettings] = await Promise.all([
    UserRepository.getCurrentUser(),
    params,
    loadMarketContextSettings(),
  ])
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
