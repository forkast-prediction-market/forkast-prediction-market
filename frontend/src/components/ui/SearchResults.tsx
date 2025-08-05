import Image from 'next/image'
import Link from 'next/link'
import { LoaderIcon } from 'lucide-react'
import type { SearchResult } from '@/hooks/useSearch'
import { getSupabaseImageUrl } from '@/lib/mockData'

interface SearchResultsProps {
  results: SearchResult[]
  isLoading: boolean
  onResultClick: () => void
}

export function SearchResults({ results, isLoading, onResultClick }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-background shadow-lg">
        <div className="flex items-center justify-center p-4">
          <LoaderIcon className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return null
  }

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border bg-background shadow-lg">
      {results.map((result, index) => (
        <Link
          key={`${result.id}-${result.marketSlug}-${index}`}
          href={`/event/${result.eventSlug}`}
          onClick={onResultClick}
          className="flex items-center justify-between p-3 transition-colors hover:bg-accent first:rounded-t-lg last:rounded-b-lg"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Event Icon */}
            <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded">
              {result.iconUrl ? (
                <Image
                  src={getSupabaseImageUrl(result.iconUrl) || '/placeholder-market.png'}
                  alt={result.eventTitle}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-muted"></div>
              )}
            </div>

            {/* Event Title */}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium text-foreground">
                {result.eventTitle}
              </h3>
            </div>
          </div>

          {/* Right side: Percentage and description */}
          <div className="flex flex-col items-end text-right">
            <span className="text-lg font-bold text-foreground">
              {result.percentage}%
            </span>
            {result.displayText && (
              <span className="text-xs text-muted-foreground max-w-[100px] truncate">
                {result.displayText}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
