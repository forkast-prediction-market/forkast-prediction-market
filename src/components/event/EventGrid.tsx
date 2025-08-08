'use client'

import type { Event, EventCategory } from '@/types'
import { BarChart3Icon, SearchIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import EventCard from './EventCard'

interface Props {
  events: any
  activeCategory: EventCategory
  searchQuery: string
  favoriteMarkets: Set<string>
}

export default function EventGrid({
  events,
  activeCategory,
  searchQuery,
  favoriteMarkets,
}: Props) {
  const [openCardId, setOpenCardId] = useState<string | null>(null)

  if (events.length === 0) {
    return (
      <main className="container mx-auto py-3">
        <div className="py-12 text-center">
          <div className="mb-2 flex justify-center text-muted-foreground">
            {searchQuery
              ? <SearchIcon className="size-6" />
              : <BarChart3Icon className="size-6" />}
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
            <XIcon className="size-4" />
            Clear filters
          </Button>
        </div>
      </main>
    )
  }

  return events.map((event: Event) => (
    <EventCard
      key={event.id}
      event={event}
      isOpen={openCardId === event.id}
      onToggle={isOpen => setOpenCardId(isOpen ? event.id : null)}
      isFavorited={favoriteMarkets.has(event.id)}
      onToggleFavorite={() => {}}
    />
  ))
}
