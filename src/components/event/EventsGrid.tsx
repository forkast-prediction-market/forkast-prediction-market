'use client'

import type { Event } from '@/types'
import { useState } from 'react'
import EventCard from './EventCard'

interface Props {
  events: any
  favoriteMarkets: Set<string>
}

export default function EventsGrid({
  events,
  favoriteMarkets,
}: Props) {
  const [openCardId, setOpenCardId] = useState<string | null>(null)

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
