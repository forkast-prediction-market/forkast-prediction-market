'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import EventsEmptyState from '@/app/event/[slug]/_components/EventsEmptyState'
import EventCard from '@/components/event/EventCard'
import EventCardSkeleton from '@/components/event/EventCardSkeleton'
import { OpenCardProvider } from '@/components/event/EventOpenCardContext'

interface EventsGridProps {
  tag: string
  search: string
  bookmarked: string
  initialEvents?: any[]
}

async function fetchEvents({
  pageParam = 5,
  tag,
  search,
  bookmarked,
}: {
  pageParam: number
  tag: string
  search: string
  bookmarked: string
}) {
  const params = new URLSearchParams({
    tag,
    search,
    bookmarked,
    offset: pageParam.toString(),
  })

  const response = await fetch(`/api/events?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch events')
  }
  return response.json()
}

export default function EventsGrid({
  tag,
  search,
  bookmarked,
  initialEvents = [],
}: EventsGridProps) {
  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['events', tag, search, bookmarked],
    queryFn: ctx => fetchEvents({
      pageParam: ctx.pageParam,
      tag,
      search,
      bookmarked,
    }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 5 ? (allPages.length * 5) + 5 : undefined
    },
    initialPageParam: 5,
  })

  const allEvents = initialEvents.length > 0
    ? [...initialEvents, ...(data ? data.pages.flatMap(page => page) : [])]
    : data
      ? data.pages.flatMap(page => page)
      : []

  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 1.0 },
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [hasNextPage, fetchNextPage, isFetchingNextPage])

  if (status === 'pending' && initialEvents.length === 0) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 5 }, (_, i) => (
          <EventCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="col-span-full py-4 text-center text-sm text-muted-foreground">
        Could not load more events.
      </div>
    )
  }

  if (!allEvents || allEvents.length === 0) {
    return <EventsEmptyState tag={tag} searchQuery={search} />
  }

  return (
    <OpenCardProvider>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {allEvents.map(event => (
          <EventCard key={event.id} event={event} />
        ))}

        {hasNextPage && (
          <div
            ref={observerTarget}
            className="col-span-full flex justify-center py-4"
          >
            {isFetchingNextPage
              ? (
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 4 }, (_, i) => (
                      <EventCardSkeleton key={`loader-${i}`} />
                    ))}
                  </div>
                )
              : (
                  <div className="text-sm text-muted-foreground">
                    Loading more...
                  </div>
                )}
          </div>
        )}

        {!hasNextPage && allEvents.length > initialEvents.length && (
          <div className="col-span-full py-4 text-center text-sm text-muted-foreground">
            Nothing more to load
          </div>
        )}
      </div>
    </OpenCardProvider>
  )
}
