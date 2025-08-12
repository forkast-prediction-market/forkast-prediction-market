import React, { Suspense } from 'react'
import EventCardSkeleton from '@/components/event/EventCardSkeleton'
import EventsGrid from '@/components/event/EventsGrid'
import FilterToolbar from '@/components/layout/FilterToolbar'

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

  return (
    <main className="container grid gap-4 py-4">
      <FilterToolbar
        activeCategory={category}
        searchQuery={search}
        showFavoritesOnly={false}
      />

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
        <Suspense fallback={<HomePageSkeleton />}>
          <EventsGrid category={category} search={search} />
        </Suspense>
      </div>
    </main>
  )
}
