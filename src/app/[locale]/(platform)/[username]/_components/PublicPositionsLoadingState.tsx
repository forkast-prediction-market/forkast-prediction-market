'use client'

import { SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import PublicPositionItemSkeleton from './PublicPositionItemSkeleton'

interface PositionsLoadingStateProps {
  skeletonCount?: number
  isSearchActive?: boolean
  searchQuery?: string
  marketStatusFilter?: 'active' | 'closed'
  retryCount?: number
}

export default function PublicPositionsLoadingState({
  skeletonCount,
  isSearchActive = false,
  searchQuery = '',
  marketStatusFilter = 'active',
  retryCount = 0,
}: PositionsLoadingStateProps) {
  const [resolvedCount, setResolvedCount] = useState(() => skeletonCount ?? 8)

  useEffect(() => {
    if (skeletonCount !== undefined) {
      setResolvedCount(skeletonCount)
      return
    }

    setResolvedCount(window.innerWidth < 768 ? 6 : 8)
  }, [skeletonCount])

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="space-y-0">
        {Array.from({ length: resolvedCount }).map((_, index) => (
          <PublicPositionItemSkeleton key={index} />
        ))}
      </div>

      <div className="p-4 text-center">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {retryCount > 0
              ? 'Retrying...'
              : isSearchActive && searchQuery.trim()
                ? `Searching for "${searchQuery}"...`
                : `Loading ${marketStatusFilter} positions...`}
          </div>

          {isSearchActive && searchQuery.trim() && retryCount === 0 && (
            <div className={`
              inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800
              dark:bg-orange-900/30 dark:text-orange-300
            `}
            >
              <SearchIcon className="size-3" />
              Active search
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
