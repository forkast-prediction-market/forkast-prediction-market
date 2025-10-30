'use client'

import { SearchIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

interface FilterToolbarSearchInputProps {
  search: string
  onSearchChange: (search: string) => void
}

export default function FilterToolbarSearchInput({ search, onSearchChange }: FilterToolbarSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState(search)
  const isFirstRender = useRef(true)
  const prevSearch = useRef(search)

  // Update local state when search prop changes (e.g., from localStorage restore)
  useEffect(() => {
    if (prevSearch.current !== search) {
      prevSearch.current = search
      setSearchQuery(search)
    }
  }, [search])

  // Debounced search callback to parent component
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const handler = setTimeout(() => {
      onSearchChange(searchQuery)
    }, 500)

    return () => clearTimeout(handler)
  }, [searchQuery, onSearchChange])

  const iconClasses = 'pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground'

  return (
    <div className="relative w-full md:w-44 lg:w-52 xl:w-56">
      <SearchIcon className={iconClasses} />
      <Input
        type="text"
        data-testid="filter-search-input"
        placeholder="Search"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="pl-10 focus-visible:ring-0"
      />
    </div>
  )
}
