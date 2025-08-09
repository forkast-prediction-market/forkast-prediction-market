'use client'

import type { FilterPill } from '@/types'
import { BookmarkIcon } from 'lucide-react'
import { useState } from 'react'
import FilterToolbarSearchInput from '@/components/layout/FilterToolbarSearchInput'
import { Button } from '@/components/ui/button'
import { getFilterPillsByCategory } from '@/lib/mockData'

interface FilterToolbarProps {
  activeCategory: string
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

  return (
    <div className="flex items-center gap-4 py-2">
      <FilterToolbarSearchInput search={searchQuery} />

      {/* Favorites Filter Button */}
      <button
        type="button"
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
