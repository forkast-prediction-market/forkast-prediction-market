import { Suspense } from 'react'
import EventCardSkeleton from '@/components/EventCardSkeleton'
import EventsLoader from '@/components/EventsLoader'
import FilterToolbar from '@/components/FilterToolbar'

function HomePageSkeleton() {
  const skeletons = Array.from({ length: 20 }, (_, i) => `skeleton-${i}`)

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {skeletons.map(id => <EventCardSkeleton key={id} />)}
    </div>
  )
}

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const params = await searchParams
  const search = (params.search as string) ?? ''
  const tag = (params.tag as string) ?? 'trending'
  const bookmarked = (params.bookmarked as string) ?? 'false'

  return (
    <main className="container grid gap-4 py-4">
      <FilterToolbar search={search} bookmarked={bookmarked} />

      <Suspense fallback={<HomePageSkeleton />}>
        <EventsLoader tag={tag} search={search} bookmarked={bookmarked} />
      </Suspense>
    </main>
  )
}
