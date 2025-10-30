'use client'

import type { Event } from '@/types'
import { useEffect, useRef } from 'react'
import { OpenCardProvider } from '@/components/EventOpenCardContext'
import EventsGrid from '@/components/EventsGrid'
import FilterToolbar from '@/components/FilterToolbar'
import { useFilters } from '@/contexts/FilterContext'

/**
 * FilterState interface matching the design document requirements
 * Represents all filter options available on the homepage
 */
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

// localStorage key for persisting filter state
const STORAGE_KEY = 'homepage-filters'

/**
 * HomeClient component manages all filter state for the homepage using React Context
 * instead of relying on URL searchParams. This enables static generation and
 * CDN caching while maintaining all filtering functionality.
 *
 * Features:
 * - Client-side filter state management via Context
 * - localStorage persistence across sessions
 * - Integration with existing FilterToolbar and EventsGrid components
 * - Support for SEO-friendly tag routes via initialTag prop
 * - Navigation integration through shared context
 */
export default function HomeClient({ initialEvents, initialTag }: HomeClientProps) {
  const { filters, updateFilters } = useFilters()
  const hasInitialized = useRef(false)

  // Load filters from localStorage on mount and sync with context
  useEffect(() => {
    if (hasInitialized.current) {
      return // Already initialized, don't run again
    }

    hasInitialized.current = true
    let hasUpdated = false

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsedFilters = JSON.parse(saved) as Partial<FilterState>
        // Validate that parsed filters have expected structure
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

        // Update context with saved filters, prioritizing initialTag if provided
        const finalFilters = {
          ...validatedFilters,
          // Override with initialTag if provided (for SEO routes like /t/[tag])
          tag: initialTag || validatedFilters.tag || 'trending',
        }

        updateFilters(finalFilters)
        hasUpdated = true
      }

      if (!hasUpdated && initialTag) {
        // If no saved filters but initialTag provided, update context
        updateFilters({ tag: initialTag })
      }
    }
    catch (error) {
      // Ignore invalid JSON, keep default filters
      console.warn('Failed to parse saved filters from localStorage:', error)
      if (initialTag) {
        updateFilters({ tag: initialTag })
      }
    }
  }, [initialTag, updateFilters]) // Safe to include dependencies now with the ref guard

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
    }
    catch (error) {
      // Ignore localStorage errors (e.g., in private browsing mode)
      console.warn('Failed to save filters to localStorage:', error)
    }
  }, [filters])

  return (
    <>
      {/*
        FilterToolbar now uses callback-based state updates (Task 3 completed)
        Passes filters object and onFiltersChange callback from context
      */}
      <FilterToolbar
        filters={filters}
        onFiltersChange={updateFilters}
      />

      <OpenCardProvider>
        {/*
          EventsGrid now accepts filters object (Task 5 completed)
          Uses filters object in queryKey and fetchEvents function
        */}
        <EventsGrid
          filters={filters}
          initialEvents={initialEvents}
        />
      </OpenCardProvider>
    </>
  )
}
