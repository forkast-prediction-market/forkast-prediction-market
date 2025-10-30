'use cache'

import type { Event } from '@/types'
import HomeClient from '@/components/HomeClient'
import { EventRepository } from '@/lib/db/queries/event'

export default async function HomePage() {
  // Fetch initial trending events without user context for static caching
  // This ensures the page can be cached with Next.js 16 Cache Components
  let initialEvents: Event[] = []

  try {
    const { data: events, error } = await EventRepository.listEvents({
      tag: 'trending',
      search: '',
      userId: '', // Force anonymous for static caching
      bookmarked: false,
    })

    if (error) {
      console.warn('Failed to fetch initial events for static generation:', error)
    }
    else {
      initialEvents = events ?? []
    }
  }
  catch (error) {
    // Fallback to empty state - client will fetch data after hydration
    console.warn('Error during static generation, falling back to empty state:', error)
    initialEvents = []
  }

  return (
    <main className="container grid gap-4 py-4">
      <HomeClient initialEvents={initialEvents} />
    </main>
  )
}
