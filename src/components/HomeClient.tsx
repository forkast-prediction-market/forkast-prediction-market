'use client'

import type { Event } from '@/types'
import { useEffect, useRef } from 'react'
import { OpenCardProvider } from '@/components/EventOpenCardContext'
import EventsGrid from '@/components/EventsGrid'
import FilterToolbar from '@/components/FilterToolbar'
import { useFilters } from '@/providers/FilterProvider'

interface HomeClientProps {
  initialEvents: Event[]
  initialTag?: string
}

export default function HomeClient({ initialEvents, initialTag }: HomeClientProps) {
  const { filters, updateFilters } = useFilters()
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) {
      return
    }

    hasInitialized.current = true

    if (initialTag) {
      updateFilters({ tag: initialTag })
    }
  }, [initialTag, updateFilters])

  return (
    <>
      <FilterToolbar
        filters={filters}
        onFiltersChange={updateFilters}
      />

      <OpenCardProvider>
        <EventsGrid
          filters={filters}
          initialEvents={initialEvents}
        />
      </OpenCardProvider>
    </>
  )
}
