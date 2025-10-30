'use client'

import type { FilterState } from '@/providers/FilterProvider'
import type { Event } from '@/types'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState } from 'react'
import EventsEmptyState from '@/app/(platform)/event/[slug]/_components/EventsEmptyState'
import EventCard from '@/components/EventCard'
import EventCardSkeleton from '@/components/EventCardSkeleton'
import EventsGridSkeleton from '@/components/EventsGridSkeleton'
import { useColumns } from '@/hooks/useColumns'
import { cn } from '@/lib/utils'

interface EventsGridProps {
  filters: FilterState
  initialEvents: Event[]
}

const EMPTY_EVENTS: Event[] = []

async function fetchEvents({
  pageParam = 0,
  filters,
}: {
  pageParam: number
  filters: FilterState
}): Promise<Event[]> {
  const params = new URLSearchParams({
    tag: filters.tag,
    search: filters.search,
    bookmarked: filters.bookmarked,
    offset: pageParam.toString(),
  })
  if (filters.hideSports) {
    params.set('hideSports', 'true')
  }
  if (filters.hideCrypto) {
    params.set('hideCrypto', 'true')
  }
  if (filters.hideEarnings) {
    params.set('hideEarnings', 'true')
  }
  const response = await fetch(`/api/events?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch events')
  }
  return response.json()
}

export default function EventsGrid({
  filters,
  initialEvents = EMPTY_EVENTS,
}: EventsGridProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [scrollMargin, setScrollMargin] = useState(0)
  const PAGE_SIZE = 40
  const isDefaultState = filters.tag === 'trending' && filters.search === '' && filters.bookmarked === 'false'
  const shouldUseInitialData = isDefaultState && initialEvents.length > 0

  const {
    status,
    data,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isPending,
  } = useInfiniteQuery({
    queryKey: ['events', filters.tag, filters.search, filters.bookmarked, filters.hideSports, filters.hideCrypto, filters.hideEarnings],
    queryFn: ({ pageParam }) => fetchEvents({
      pageParam,
      filters,
    }),
    getNextPageParam: (lastPage, allPages) => lastPage.length > 0 ? allPages.length * PAGE_SIZE : undefined,
    initialPageParam: 0,
    initialData: shouldUseInitialData ? { pages: [initialEvents], pageParams: [0] } : undefined,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
    placeholderData: previousData => previousData,
  })

  const allEvents = useMemo(() => (data ? data.pages.flat() : []), [data])

  const visibleEvents = useMemo(() => {
    if (!allEvents || allEvents.length === 0) {
      return EMPTY_EVENTS
    }

    return allEvents.filter((event) => {
      const tagSlugs = new Set<string>()

      if (event.main_tag) {
        tagSlugs.add(event.main_tag.toLowerCase())
      }

      for (const tag of event.tags ?? []) {
        if (tag?.slug) {
          tagSlugs.add(tag.slug.toLowerCase())
        }
      }

      const slugs = Array.from(tagSlugs)
      const hasSportsTag = slugs.some(slug => slug.includes('sport'))
      const hasCryptoTag = slugs.some(slug => slug.includes('crypto'))
      const hasEarningsTag = slugs.some(slug => slug.includes('earning'))

      if (filters.hideSports && hasSportsTag) {
        return false
      }

      if (filters.hideCrypto && hasCryptoTag) {
        return false
      }

      return !(filters.hideEarnings && hasEarningsTag)
    })
  }, [allEvents, filters.hideSports, filters.hideCrypto, filters.hideEarnings])

  const columns = useColumns()

  useEffect(() => {
    queueMicrotask(() => {
      if (parentRef.current) {
        setScrollMargin(parentRef.current.offsetTop)
      }
    })
  }, [])

  const rowsCount = Math.ceil(visibleEvents.length / columns)

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

  const isLoadingNewData = isPending || (isFetching && !isFetchingNextPage && (!data || data.pages.length === 0))

  if (isLoadingNewData) {
    return (
      <div ref={parentRef}>
        <EventsGridSkeleton />
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
    return <EventsEmptyState tag={filters.tag} searchQuery={filters.search} />
  }

  if (!visibleEvents || visibleEvents.length === 0) {
    return (
      <div
        ref={parentRef}
        className="flex min-h-[200px] min-w-0 items-center justify-center text-sm text-muted-foreground"
      >
        No events match your filters.
      </div>
    )
  }

  return (
    <div ref={parentRef} className="relative w-full">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * columns
          const end = Math.min(start + columns, visibleEvents.length)
          const rowEvents = visibleEvents.slice(start, end)

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
              <div className={cn('grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4', { 'opacity-80': isFetching })}>
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
