'use client'

import type { EventCategory, FilterPill } from '@/types'
import { BookmarkIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getFilterPillsByCategory } from '@/lib/mockData'

interface FilterToolbarProps {
  activeCategory: EventCategory
  searchQuery: string
  showFavoritesOnly: boolean
}

export default function FilterToolbar({
  activeCategory,
  searchQuery,
  showFavoritesOnly,
}: FilterToolbarProps) {
  const [activePill, setActivePill] = useState('all')

  const filterPills = getFilterPillsByCategory(activeCategory)

  function onToggleFavorites() {}
  function onSearchChange(_: any) {}

  return (
    <div className="flex items-center gap-4 py-2">
      <div className="relative w-48 shrink-0">
        <SearchIcon className="absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Favorites Filter Button */}
      <button
        type="button"
        onClick={onToggleFavorites}
        className="text-muted-foreground transition-colors hover:text-primary"
        title={showFavoritesOnly ? 'Mostrar todos' : 'Apenas favoritos'}
      >
        {showFavoritesOnly
          ? <BookmarkIcon className="size-3.5 fill-current text-primary" />
          : <BookmarkIcon className="size-3.5" />}
      </button>

      {/* Separator */}
      <div className="h-6 w-px shrink-0 bg-border"></div>

      {/* Filter Pills */}
      <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto">
        {filterPills.map((pill: FilterPill) => (
          <Button
            key={pill.id}
            variant={activePill === pill.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActivePill(pill.id)}
            className="h-8 shrink-0 text-xs whitespace-nowrap"
          >
            {pill.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
