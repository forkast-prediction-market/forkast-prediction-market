import React, { Suspense } from 'react'
import EventCardSkeleton from '@/components/event/EventCardSkeleton'
import EventGrid from '@/components/event/EventGrid'
import { index } from '@/lib/db/events'

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function HomePageSkeleton() {
  const skeletons = Array.from({ length: 8 }, (_, i) => `skeleton-${i}`)
  return skeletons.map(id => <EventCardSkeleton key={id} />)
}

export default async function HomePage({ searchParams }: Props) {
  const category = (await searchParams).category as string ?? 'trending'
  const events = await index(category)
  const favoriteMarkets = new Set<string>()

  return (
    <main className="container mx-auto py-3">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Suspense fallback={<HomePageSkeleton />}>
          <EventGrid
            events={events}
            activeCategory={category}
            searchQuery=""
            favoriteMarkets={favoriteMarkets}
          />
        </Suspense>
      </div>
    </main>
  )
}
