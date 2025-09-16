'use client'

import type { Event } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import EventsEmptyState from '@/app/event/[slug]/_components/EventsEmptyState'
import EventCard from '@/components/event/EventCard'
import EventCardSkeleton from '@/components/event/EventCardSkeleton'
import { useColumns } from '@/hooks/useColumns'

interface EventsGridProps {
  tag: string
  search: string
  bookmarked: string
  initialEvents?: Event[]
}

const EMPTY_EVENTS: Event[] = []
const PAGE_SIZE = 20

async function fetchEvents({
  pageParam = 0,
  tag,
  search,
  bookmarked,
}: {
  pageParam: number
  tag: string
  search: string
  bookmarked: string
}): Promise<Event[]> {
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

function HomePageSkeleton() {
  const skeletons = Array.from({ length: 8 }, (_, i) => `skeleton-${i}`)
  return skeletons.map(id => <EventCardSkeleton key={id} />)
}

export default function EventsGrid({
  tag,
  search,
  bookmarked,
  initialEvents = EMPTY_EVENTS,
}: EventsGridProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['events', tag, search, bookmarked],
    queryFn: ({ pageParam }) => fetchEvents({ pageParam, tag, search, bookmarked }),
    getNextPageParam: (lastPage, allPages) => lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    initialPageParam: 20,
  })

  const allEvents
    = initialEvents.length > 0
      ? [...initialEvents, ...(data ? data.pages.flat() : [])]
      : data
        ? data.pages.flat()
        : []

  const columns = useColumns()

  const rowsCount = Math.ceil(allEvents.length / columns)

  const virtualizer = useWindowVirtualizer({
    count: rowsCount,
    estimateSize: () => 194,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
    onChange: (instance) => {
      const items = instance.getVirtualItems()
      const last = items[items.length - 1]
      if (
        last
        && last.index >= rowsCount - 2
        && hasNextPage
        && !isFetchingNextPage
      ) {
        queueMicrotask(() => fetchNextPage())
      }
    },
  })

  if (status === 'pending' && initialEvents.length === 0) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <HomePageSkeleton />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Could not load more events.
      </p>
    )
  }

  if (!allEvents || allEvents.length === 0) {
    return <EventsEmptyState tag={tag} searchQuery={search} />
  }

  return (
    <div ref={parentRef} className="w-full">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * columns
          const end = Math.min(start + columns, allEvents.length)
          const rowEvents = allEvents.slice(start, end)

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${
                  virtualRow.start
                  - (virtualizer.options.scrollMargin ?? 0)
                }px)`,
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {rowEvents.map(event => <EventCard key={event.id} event={event} />)}
                {isFetchingNextPage && <EventCardSkeleton />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
