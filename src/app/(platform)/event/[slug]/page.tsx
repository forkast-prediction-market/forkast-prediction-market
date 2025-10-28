import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import EventContent from '@/app/(platform)/event/[slug]/_components/EventContent'
import { loadMarketContextSettings } from '@/lib/ai/market-context-config'
import { EventRepository } from '@/lib/db/queries/event'
import { UserRepository } from '@/lib/db/queries/user'
import { syncEventTradingSnapshot } from '@/lib/trading/sync-event'

const SNAPSHOT_MAX_AGE_MS = 30_000

export async function generateMetadata({ params }: PageProps<'/event/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const { data } = await EventRepository.getEventTitleBySlug(slug)

  return {
    title: data?.title,
  }
}

export default async function EventPage({ params }: PageProps<'/event/[slug]'>) {
  const { slug } = await params
  const user = await UserRepository.getCurrentUser()
  const marketContextSettings = await loadMarketContextSettings()
  const marketContextEnabled = marketContextSettings.enabled && Boolean(marketContextSettings.apiKey)

  try {
    const { data: event, error } = await EventRepository.getEventBySlug(slug, user?.id ?? '')
    if (error || !event) {
      notFound()
    }

    const now = Date.now()
    const shouldRefresh = event.markets.some((market) => {
      if (!market.last_snapshot_at) {
        return true
      }

      const snapshotTime = new Date(market.last_snapshot_at).getTime()
      return Number.isNaN(snapshotTime) || now - snapshotTime > SNAPSHOT_MAX_AGE_MS
    })

    if (shouldRefresh) {
      syncEventTradingSnapshot(slug).catch((refreshError) => {
        console.error(`Failed to refresh trading snapshot for event ${slug}.`, refreshError)
      })
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
  catch {
    notFound()
  }
}
