import React, { Suspense } from 'react'
import EventCardSkeleton from '@/components/event/EventCardSkeleton'
import EventsEmptyState from '@/components/event/EventsEmptyState'
import EventsGrid from '@/components/event/EventsGrid'
import FilterToolbar from '@/components/layout/FilterToolbar'
import { index } from '@/lib/db/events'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function HomePageSkeleton() {
  const skeletons = Array.from({ length: 8 }, (_, i) => `skeleton-${i}`)
  return skeletons.map(id => <EventCardSkeleton key={id} />)
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = (params.search as string) ?? ''
  const category = (params.category as string) ?? 'trending'
  const events = await index(category, search)
  const favoriteMarkets = new Set<string>()

  return (
    <main className="container grid gap-4 py-4">
      <FilterToolbar
        activeCategory={category}
        searchQuery={search}
        showFavoritesOnly={false}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
        <Suspense fallback={<HomePageSkeleton />}>
          {events.length === 0 && <EventsEmptyState activeCategory={category} searchQuery={search} />}
          <EventsGrid events={events} favoriteMarkets={favoriteMarkets} />
        </Suspense>
      </div>
    </main>
  )
}
