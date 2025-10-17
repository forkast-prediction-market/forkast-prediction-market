'use client'

import { SearchIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { SearchResults } from '@/components/SearchResults'
import { Input } from '@/components/ui/input'
import { useSearch } from '@/hooks/useSearch'

export default function HeaderSearch() {
  const searchRef = useRef<HTMLDivElement>(null)
  const { query, handleQueryChange, results, isLoading, showResults, clearSearch, hideResults, activeTab, setActiveTab } = useSearch()
  const sitename = `${process.env.NEXT_PUBLIC_SITE_NAME || 'events and profiles'}`.toLowerCase()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        hideResults()
      }
    }

    if (showResults) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showResults, hideResults])

  return (
    <div
      className="relative ms-2 me-2 hidden flex-1 sm:ms-4 sm:me-0 sm:flex sm:max-w-xl"
      ref={searchRef}
      data-testid="header-search-container"
    >
      <SearchIcon className="absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        data-testid="header-search-input"
        placeholder={`Search ${sitename}`}
        value={query}
        onChange={e => handleQueryChange(e.target.value)}
        className="w-full pl-9 text-sm"
      />
      {(showResults || isLoading.events || isLoading.profiles) && (
        <SearchResults
          results={results}
          isLoading={isLoading}
          activeTab={activeTab}
          query={query}
          onResultClick={clearSearch}
          onTabChange={setActiveTab}
        />
      )}
    </div>
  )
}
