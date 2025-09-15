'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
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

  const listRef = useRef<HTMLDivElement>(null)

  const itemVirtualizer = useWindowVirtualizer({
    count: hasNextPage ? allEvents.length + 4 : allEvents.length,
    estimateSize: () => 200,
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  })

  useEffect(() => {
    const [lastItem] = [...itemVirtualizer.getVirtualItems()].reverse()

    if (!lastItem) {
      return
    }

    if (
      lastItem.index >= allEvents.length - 1
      && hasNextPage
      && !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }, [
    hasNextPage,
    fetchNextPage,
    allEvents.length,
    isFetchingNextPage,
    itemVirtualizer.getVirtualItems(),
  ])

  if (status === 'pending' && initialEvents.length === 0) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <EventCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="py-8 text-center">
        <p className="text-red-500">
          Error:
        </p>
      </div>
    )
  }

  if (!allEvents || allEvents.length === 0) {
    return <EventsEmptyState tag={tag} searchQuery={search} />
  }

  return (
    <OpenCardProvider>
      <div ref={listRef}>
        <div
          className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          style={{
            height: `${itemVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {itemVirtualizer.getVirtualItems().map((virtualItem) => {
            const isLoaderItem = virtualItem.index >= allEvents.length
            const event = allEvents[virtualItem.index]

            if (isLoaderItem) {
              return (
                <div
                  key={`loader-${virtualItem.index}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start - itemVirtualizer.options.scrollMargin}px)`,
                  }}
                >
                  <EventCardSkeleton />
                </div>
              )
            }

            return (
              <div
                key={event.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start - itemVirtualizer.options.scrollMargin}px)`,
                }}
              >
                <EventCard event={event} />
              </div>
            )
          })}
        </div>
      </div>
    </OpenCardProvider>
  )
}
