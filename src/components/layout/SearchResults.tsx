import type { SearchResult } from '@/hooks/useSearch'
import { LoaderIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getSupabaseImageUrl } from '@/lib/mockData'

interface SearchResultsProps {
  results: SearchResult[]
  isLoading: boolean
  onResultClick: () => void
}

export function SearchResults({ results, isLoading, onResultClick }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="absolute top-full right-0 left-0 z-50 mt-1 rounded-lg border bg-background shadow-lg sm:w-3/4">
        <div className="flex items-center justify-center p-4">
          <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return null
  }

  return (
    <div className={`
      absolute top-full right-0 left-0 z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border bg-background shadow-lg
      sm:w-3/4
    `}
    >
      {results.map(result => (
        <Link
          key={`${result.id}-${result.marketSlug}`}
          href={`/event/${result.eventSlug}`}
          onClick={onResultClick}
          className={`
            flex items-center justify-between p-3 transition-colors
            first:rounded-t-lg
            last:rounded-b-lg
            hover:bg-accent
          `}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Event Icon */}
            <div className="size-8 flex-shrink-0 overflow-hidden rounded">
              {result.iconUrl
                ? (
                    <Image
                      src={getSupabaseImageUrl(result.iconUrl) || '/placeholder-market.png'}
                      alt={result.eventTitle}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  )
                : <div className="h-full w-full bg-muted"></div>}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium text-foreground">
                {result.eventTitle}
              </h3>
            </div>
          </div>

          <div className="flex flex-col items-end text-right">
            <span className="text-lg font-bold text-foreground">
              {result.percentage}
              %
            </span>
            {result.displayText && (
              <span className="max-w-[100px] truncate text-xs text-muted-foreground">
                {result.displayText}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
