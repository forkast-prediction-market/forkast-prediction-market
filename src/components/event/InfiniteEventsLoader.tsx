'use client'

import React, { memo, useCallback, useEffect, useState } from 'react'
import EventCardSkeleton from '@/components/event/EventCardSkeleton'
import { Button } from '@/components/ui/button'

interface InfiniteEventsLoaderProps {
  onLoadMore: () => void
  isLoading: boolean
  hasMore: boolean
  isError: boolean
  errorMessage?: string
  retryCount?: number
  triggerRef?: (element: HTMLElement | null) => void
}

function InfiniteEventsLoader({
  onLoadMore,
  isLoading,
  hasMore,
  isError,
  errorMessage = 'Failed to load more events',
  retryCount = 0,
  triggerRef,
}: InfiniteEventsLoaderProps) {
  const [isManualRetrying, setIsManualRetrying] = useState(false)

  const handleManualRetry = useCallback(async () => {
    setIsManualRetrying(true)

    // Small delay for UX feedback
    await new Promise(resolve => setTimeout(resolve, 500))

    onLoadMore()
    setIsManualRetrying(false)
  }, [onLoadMore])

  // Reset manual retry state when loading starts
  useEffect(() => {
    function resetRetrying() {
      setIsManualRetrying(false)
    }

    if (isLoading && isManualRetrying) {
      resetRetrying()
    }
  }, [isLoading, isManualRetrying])

  // Loading state
  if (isLoading || isManualRetrying) {
    return <EventCardSkeleton />
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Automatic retry attempt
              {' '}
              {retryCount}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRetry}
          disabled={isManualRetrying}
        >
          {isManualRetrying ? 'Retrying...' : 'Try Again'}
        </Button>
      </div>
    )
  }

  // End of list state - no message displayed
  if (!hasMore) {
    return null
  }

  // Trigger element for intersection observer
  // This element should be invisible but detectable by intersection observer
  return (
    <div
      ref={triggerRef}
      className="h-1 w-full"
      data-testid="infinite-loader-trigger"
      aria-hidden="true"
    />
  )
}

InfiniteEventsLoader.displayName = 'InfiniteEventsLoader'

// Memoize the component to prevent unnecessary re-renders
export default memo(InfiniteEventsLoader)
