'use client'

import type { Event } from '@/types'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useRef, useState } from 'react'
import EventsEmptyState from '@/app/event/[slug]/_components/EventsEmptyState'
import EventCard from '@/components/event/EventCard'
import EventCardSkeleton from '@/components/event/EventCardSkeleton'
import { useColumns } from '@/hooks/useColumns'

interface EventsGridProps {
  tag: string
  search: string
  bookmarked: string
  initialEvents: Event[]
}

const EMPTY_EVENTS: Event[] = []

async function fetchEvents({
  offset = 0,
  tag,
  search,
  bookmarked,
}: {
  offset: number
  tag: string
  search: string
  bookmarked: string
}): Promise<Event[]> {
  const params = new URLSearchParams({
    tag,
    search,
    bookmarked,
    offset: offset.toString(),
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
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return
    }

    setIsLoadingMore(true)
    try {
      const nextOffset = events.length
      const newEvents = await fetchEvents({
        offset: nextOffset,
        tag,
        search,
        bookmarked,
      })

      if (newEvents.length < initialEvents.length) {
        setHasMore(false)
      }

      setEvents(prev => [...prev, ...newEvents])
    }
    catch (error) {
      console.error('Failed to load more events:', error)
      setHasMore(false)
    }
    finally {
      setIsLoadingMore(false)
    }
  }, [events.length, isLoadingMore, hasMore, tag, search, bookmarked, initialEvents])

  const columns = useColumns()
  const rowsCount = Math.ceil(events.length / columns)

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
        && hasMore
        && !isLoadingMore
      ) {
        loadMore()
      }
    },
  })

  if (events.length === 0) {
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
          const end = Math.min(start + columns, events.length)
          const rowEvents = events.slice(start, end)

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
                {isLoadingMore && <EventCardSkeleton />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
