'use client'

import type { Event } from '@/types'
import { useEffect, useRef } from 'react'
import { OpenCardProvider } from '@/components/EventOpenCardContext'
import EventsGrid from '@/components/EventsGrid'
import FilterToolbar from '@/components/FilterToolbar'
import { useFilters } from '@/providers/FilterProvider'

export interface FilterState {
  search: string
  tag: string
  bookmarked: 'true' | 'false'
  hideSports: boolean
  hideCrypto: boolean
  hideEarnings: boolean
}

interface HomeClientProps {
  initialEvents: Event[]
  initialTag?: string
}

const STORAGE_KEY = 'homepage-filters'

export default function HomeClient({ initialEvents, initialTag }: HomeClientProps) {
  const { filters, updateFilters } = useFilters()
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) {
      return
    }

    hasInitialized.current = true
    let hasUpdated = false

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsedFilters = JSON.parse(saved) as Partial<FilterState>
        const validatedFilters: Partial<FilterState> = {}

        if (typeof parsedFilters.search === 'string') {
          validatedFilters.search = parsedFilters.search
        }
        if (typeof parsedFilters.tag === 'string') {
          validatedFilters.tag = parsedFilters.tag
        }
        if (parsedFilters.bookmarked === 'true' || parsedFilters.bookmarked === 'false') {
          validatedFilters.bookmarked = parsedFilters.bookmarked
        }
        if (typeof parsedFilters.hideSports === 'boolean') {
          validatedFilters.hideSports = parsedFilters.hideSports
        }
        if (typeof parsedFilters.hideCrypto === 'boolean') {
          validatedFilters.hideCrypto = parsedFilters.hideCrypto
        }
        if (typeof parsedFilters.hideEarnings === 'boolean') {
          validatedFilters.hideEarnings = parsedFilters.hideEarnings
        }

        const finalFilters = {
          ...validatedFilters,
          tag: initialTag || validatedFilters.tag || 'trending',
        }

        updateFilters(finalFilters)
        hasUpdated = true
      }

      if (!hasUpdated && initialTag) {
        updateFilters({ tag: initialTag })
      }
    }
    catch (error) {
      console.warn('Failed to parse saved filters from localStorage:', error)
      if (initialTag) {
        updateFilters({ tag: initialTag })
      }
    }
  }, [initialTag, updateFilters])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
    }
    catch {

    }
  }, [filters])

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
