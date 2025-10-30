'use client'

import type { ReactNode } from 'react'
import { createContext, use, useCallback, useMemo, useState } from 'react'

export interface FilterState {
  search: string
  tag: string
  bookmarked: 'true' | 'false'
  hideSports: boolean
  hideCrypto: boolean
  hideEarnings: boolean
}

interface FilterContextType {
  filters: FilterState
  updateFilters: (updates: Partial<FilterState>) => void
}

const FilterContext = createContext<FilterContextType | null>(null)

interface FilterProviderProps {
  children: ReactNode
  initialTag?: string
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  tag: 'trending',
  bookmarked: 'false',
  hideSports: false,
  hideCrypto: false,
  hideEarnings: false,
}

export function FilterProvider({ children, initialTag }: FilterProviderProps) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...(initialTag && { tag: initialTag }),
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
