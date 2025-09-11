"use client";

import React, { memo, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface InfiniteEventsLoaderProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  isError: boolean;
  errorMessage?: string;
  retryCount?: number;
  triggerRef?: (element: HTMLElement | null) => void;
}

function InfiniteEventsLoader({
  onLoadMore,
  isLoading,
  hasMore,
  isError,
  errorMessage = "Failed to load more events",
  retryCount = 0,
  triggerRef,
}: InfiniteEventsLoaderProps) {
  const [isManualRetrying, setIsManualRetrying] = useState(false);

  const handleManualRetry = useCallback(async () => {
    setIsManualRetrying(true);

    // Small delay for UX feedback
    await new Promise((resolve) => setTimeout(resolve, 500));

    onLoadMore();
    setIsManualRetrying(false);
  }, [onLoadMore]);

  // Reset manual retry state when loading starts
  useEffect(() => {
    function resetRetrying() {
      setIsManualRetrying(false);
    }

    if (isLoading && isManualRetrying) {
      resetRetrying();
    }
  }, [isLoading, isManualRetrying]);

  // Loading state
  if (isLoading || isManualRetrying) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <div className="flex items-center space-x-2">
          <div
            className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"
            role="status"
            aria-label="Loading"
          />
          <span className="text-sm text-muted-foreground">
            {isManualRetrying ? "Retrying..." : "Loading more events..."}
          </span>
        </div>

        {/* Loading skeleton for events */}
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-4 w-full" data-testid="skeleton-1" />
          <Skeleton className="h-4 w-3/4" data-testid="skeleton-2" />
          <Skeleton className="h-4 w-1/2" data-testid="skeleton-3" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Automatic retry attempt {retryCount}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRetry}
          disabled={isManualRetrying}
        >
          {isManualRetrying ? "Retrying..." : "Try Again"}
        </Button>
      </div>
    );
  }

  // End of list state
  if (!hasMore) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            You've reached the end of the list
          </p>
          <p className="text-xs text-muted-foreground">
            No more events to load
          </p>
        </div>
      </div>
    );
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
  );
}

InfiniteEventsLoader.displayName = "InfiniteEventsLoader";

// Memoize the component to prevent unnecessary re-renders
export default memo(InfiniteEventsLoader);
