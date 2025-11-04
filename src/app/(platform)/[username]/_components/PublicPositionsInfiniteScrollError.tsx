'use client'

import { AlertCircleIcon, RefreshCwIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PublicPositionsInfiniteScrollErrorProps {
  searchQuery?: string
  retryCount?: number
  isLoadingMore?: boolean
  onRetry?: () => void
  onStartOver?: () => void
}

export default function PublicPositionsInfiniteScrollError({
  searchQuery,
  retryCount = 0,
  isLoadingMore = false,
  onRetry,
  onStartOver,
}: PublicPositionsInfiniteScrollErrorProps) {
  const isSearchActive = searchQuery && searchQuery.trim().length > 0

  return (
    <div className="border-t bg-muted/30 p-4">
      <Alert variant="destructive">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertTitle>Failed to load more positions</AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p className="text-sm">
            {retryCount > 0
              ? `Unable to load more ${isSearchActive ? 'search results' : 'data'} after ${retryCount} attempt${retryCount > 1 ? 's' : ''}. Please check your connection.`
              : `There was a problem loading more ${isSearchActive ? 'search results' : 'positions data'}.`}
          </p>
          {isSearchActive && searchQuery && (
            <p className="text-xs text-muted-foreground">
              Search: "
              {searchQuery}
              "
            </p>
          )}
          <div className="flex gap-2">
            {onRetry && (
              <Button
                type="button"
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
                disabled={isLoadingMore}
              >
                <RefreshCwIcon className={cn('h-3 w-3', isLoadingMore && 'animate-spin')} />
                {isLoadingMore ? 'Retrying...' : 'Try again'}
              </Button>
            )}
            {retryCount > 2 && onStartOver && (
              <Button
                type="button"
                onClick={onStartOver}
                size="sm"
                variant="ghost"
              >
                Start over
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
