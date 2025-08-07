'use client'

import type { Event, EventCategory } from '@/types'
import { BarChart3, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getAllMarkets } from '@/lib/mockData'
import EventCard from './EventCard'
import EventCardSkeleton from './EventCardSkeleton'

interface Props {
  activeCategory: EventCategory
  searchQuery: string
  showFavoritesOnly: boolean
  favoriteMarkets: Set<string>
  onToggleFavorite: (eventId: string) => void
}

export default function EventGrid({
  activeCategory,
  searchQuery,
  showFavoritesOnly,
  favoriteMarkets,
  onToggleFavorite,
}: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {
    async function loadEvents() {
      setIsLoading(true)
      const allEvents = await getAllMarkets(activeCategory)
      setEvents(allEvents)
      setIsLoading(false)
    }

    loadEvents()
  }, [activeCategory])

  // Filter events based on category and search
  const filteredEvents = events
    .filter((event: Event) => {
      const matchesCategory
        = activeCategory === 'trending'
          ? true // Show all markets for trending, will be sorted by volume
          : activeCategory === 'new'
            ? true // For now, show all as "new"
            : event.category === activeCategory

      const matchesSearch
        = searchQuery === ''
          || event.title.toLowerCase().includes(searchQuery.toLowerCase())
          || event.description.toLowerCase().includes(searchQuery.toLowerCase())
          || event.tags.some((tag: string) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase()),
          )

      const matchesFavorites
        = !showFavoritesOnly || favoriteMarkets.has(event.id)

      return matchesCategory && matchesSearch && matchesFavorites
    })
    .sort((a: Event, b: Event) => {
      // Sort by volume descending when trending category is active
      if (activeCategory === 'trending') {
        return b.volume - a.volume
      }
      // Default sort (keep original order for other categories)
      return 0
    })

  const skeletons = Array.from({ length: 8 }, (_, i) => `skeleton-${i}`)

  if (isLoading) {
    return (
      <main className="container mx-auto py-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {skeletons.map(id => (
            <EventCardSkeleton key={id} />
          ))}
        </div>
      </main>
    )
  }

  if (filteredEvents.length === 0) {
    return (
      <main className="container mx-auto py-3">
        <div className="py-12 text-center">
          <div className="mb-2 flex justify-center text-muted-foreground">
            {searchQuery
              ? <Search className="size-6" />
              : <BarChart3 className="size-6" />}
          </div>
          <h3 className="mb-2 text-lg font-medium text-foreground">
            {searchQuery ? 'No events found' : 'No events available'}
          </h3>
          <p className="mb-6 text-sm text-muted-foreground">
            {searchQuery
              ? (
                  <>
                    Try adjusting your search for &ldquo;
                    {searchQuery}
                    &rdquo;
                  </>
                )
              : (
                  <>
                    There are no events in the
                    {' '}
                    {activeCategory}
                    {' '}
                    category with these
                    filters
                  </>
                )}
          </p>

          {/* Simple home button */}
          <Button
            onClick={() => (window.location.href = '/')}
            className="inline-flex items-center gap-2"
          >
            <X className="size-4" />
            Clear filters
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto py-3">
      {/* Events Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredEvents.map((event: Event) => (
          <EventCard
            key={event.id}
            event={event}
            isOpen={openCardId === event.id}
            onToggle={isOpen => setOpenCardId(isOpen ? event.id : null)}
            isFavorited={favoriteMarkets.has(event.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </main>
  )
}
