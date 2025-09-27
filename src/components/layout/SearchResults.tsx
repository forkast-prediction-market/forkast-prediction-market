import type { Event } from '@/types'
import { LoaderIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface SearchResultsProps {
  results: Event[]
  isLoading: boolean
  onResultClick: () => void
}

export function SearchResults({ results, isLoading, onResultClick }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="absolute top-full right-0 left-0 z-50 mt-1 w-full rounded-lg border bg-background shadow-lg">
        <div className="flex items-center justify-center p-4">
          <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return <></>
  }

  return (
    <div
      data-testid="search-results"
      className={`
        absolute top-full right-0 left-0 z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border bg-background shadow-lg
      `}
    >
      {results.map(result => (
        <Link
          key={`${result.id}-${result.slug}`}
          href={`/event/${result.slug}`}
          onClick={onResultClick}
          data-testid="search-result-item"
          className={`
            flex items-center justify-between p-3 transition-colors
            first:rounded-t-lg
            last:rounded-b-lg
            hover:bg-accent
          `}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="size-8 flex-shrink-0 overflow-hidden rounded">
              <Image
                src={result.icon_url}
                alt={result.title}
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium text-foreground">
                {result.title}
              </h3>
            </div>
          </div>

          <div className="flex flex-col items-end text-right">
            <span className="text-lg font-bold text-foreground">
              {result.markets[0].probability.toFixed(0)}
              %
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
