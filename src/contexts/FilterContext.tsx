'use client'

import type { ReactNode } from 'react'
import type { FilterState } from '@/components/HomeClient'
import { createContext, use, useCallback, useState } from 'react'

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

export function FilterProvider({ children, initialFilters = {} }: FilterProviderProps) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  })

  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }, [])

  return (
    <FilterContext value={{ filters, updateFilters }}>
      {children}
    </FilterContext>
  )
}

export function useFilters() {
  const context = use(FilterContext)
  if (!context) {
    // Fallback for components that might be rendered outside FilterProvider
    console.warn('useFilters called outside FilterProvider, using default values')
    return {
      filters: DEFAULT_FILTERS,
      updateFilters: () => {
        console.warn('updateFilters called outside FilterProvider - no-op')
      },
    }
  }
  return context
}
