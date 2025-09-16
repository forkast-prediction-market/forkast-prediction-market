'use client'

import type { Event } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'
import EventsEmptyState from '@/app/event/[slug]/_components/EventsEmptyState'
import EventCard from '@/components/event/EventCard'
import EventCardSkeleton from '@/components/event/EventCardSkeleton'
import { OpenCardProvider } from '@/components/event/EventOpenCardContext'

interface EventsGridProps {
  tag: string
  search: string
  bookmarked: string
  initialEvents?: Event[]
}

const PAGE_SIZE = 5

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
  initialEvents = [],
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
    initialPageParam: 0,
  })

  const allEvents
    = initialEvents.length > 0
      ? [...initialEvents, ...(data ? data.pages.flat() : [])]
      : data
        ? data.pages.flat()
        : []

  function getColumnsCount() {
    if (typeof window === 'undefined') {
      return 4
    }

    const width = window.innerWidth

    if (width >= 1024) {
      return 4
    }

    if (width >= 768) {
      return 3
    }

    if (width >= 640) {
      return 2
    }

    return 1
  }

  const [columns, setColumns] = useState(getColumnsCount())

  useEffect(() => {
    function handleResize() {
      return setColumns(getColumnsCount())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const rowsCount = Math.ceil(allEvents.length / columns)

  const virtualizer = useWindowVirtualizer({
    count: rowsCount,
    estimateSize: () => 195,
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
    return <EventCardSkeleton />
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

        {!hasNextPage && allEvents.length > initialEvents.length && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Nothing more to load
          </div>
        )}
      </div>
    </OpenCardProvider>
  )
}
