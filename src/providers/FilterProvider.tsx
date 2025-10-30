'use client'

import type { ReactNode } from 'react'
import type { FilterState } from '@/components/HomeClient'
import { createContext, use, useCallback, useMemo, useState } from 'react'

interface FilterContextType {
  filters: FilterState
  updateFilters: (updates: Partial<FilterState>) => void
}

const FilterContext = createContext<FilterContextType | null>(null)

interface FilterProviderProps {
  children: ReactNode
  initialFilters?: Partial<FilterState>
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  tag: 'trending',
  bookmarked: 'false',
  hideSports: false,
  hideCrypto: false,
  hideEarnings: false,
}

const INITIAL_FILTERS = {}

export function FilterProvider({ children, initialFilters = INITIAL_FILTERS }: FilterProviderProps) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  })

  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }, [])

  const filterContextValue = useMemo(() => ({ filters, updateFilters }), [filters, updateFilters])

  return (
    <FilterContext value={filterContextValue}>
      {children}
    </FilterContext>
  )
}

export function useFilters() {
  const context = use(FilterContext)
  if (!context) {
    return {
      filters: DEFAULT_FILTERS,
      updateFilters: () => {},
    }
  }
  return context
}
