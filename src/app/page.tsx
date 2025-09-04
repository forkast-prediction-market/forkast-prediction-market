import { Suspense } from 'react'
import EventCardSkeleton from '@/components/event/EventCardSkeleton'
import EventsGrid from '@/components/event/EventsGrid'
import FilterToolbar from '@/components/layout/FilterToolbar'

function HomePageSkeleton() {
  const skeletons = Array.from({ length: 8 }, (_, i) => `skeleton-${i}`)
  return skeletons.map(id => <EventCardSkeleton key={id} />)
}

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const params = await searchParams
  const search = (params.search as string) ?? ''
  const tag = (params.tag as string) ?? 'trending'
  const bookmarked = (params.bookmarked as string) ?? 'false'

  return (
    <main className="container grid gap-4 py-4">
      <FilterToolbar search={search} bookmarked={bookmarked} />

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Suspense fallback={<HomePageSkeleton />}>
          <EventsGrid tag={tag} search={search} bookmarked={bookmarked} />
        </Suspense>
      </div>
    </main>
  )
}
