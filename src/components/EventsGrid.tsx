'use client'

import type { Event } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'
import EventsEmptyState from '@/app/(platform)/event/[slug]/_components/EventsEmptyState'
import EventCard from '@/components/EventCard'
import EventCardSkeleton from '@/components/EventCardSkeleton'
import { useColumns } from '@/hooks/useColumns'

interface EventsGridProps {
  tag: string
  search: string
  bookmarked: string
  initialEvents: Event[]
}

const EMPTY_EVENTS: Event[] = []

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

export default function EventsGrid({
  tag,
  search,
  bookmarked,
  initialEvents = EMPTY_EVENTS,
}: EventsGridProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [scrollMargin, setScrollMargin] = useState(0)
  const PAGE_SIZE = 25

  const {
    status,
    data,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['events', tag, search, bookmarked],
    queryFn: ({ pageParam }) => fetchEvents({ pageParam, tag, search, bookmarked }),
    getNextPageParam: (lastPage, allPages) => lastPage.length > 0 ? allPages.length * PAGE_SIZE : undefined,
    initialPageParam: 0,
    initialData: initialEvents.length > 0 ? { pages: [initialEvents], pageParams: [0] } : undefined,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  })

  const allEvents = data ? data.pages.flat() : []

  const columns = useColumns()

  useEffect(() => {
    queueMicrotask(() => {
      if (parentRef.current) {
        setScrollMargin(parentRef.current.offsetTop)
      }
    })
  }, [])

  const rowsCount = Math.ceil(allEvents.length / columns)

  const virtualizer = useWindowVirtualizer({
    count: rowsCount,
    estimateSize: () => 194,
    scrollMargin,
    onChange: (instance) => {
      if (!hasInitialized) {
        setHasInitialized(true)
        return
      }

      const items = instance.getVirtualItems()
      const last = items[items.length - 1]
      if (
        last
        && last.index >= rowsCount - 1
        && hasNextPage
        && !isFetchingNextPage
      ) {
        queueMicrotask(() => fetchNextPage())
      }
    },
  })

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
