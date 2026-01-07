import type { RefObject } from 'react'
import type { ActivityOrder } from '@/types'
import { cn } from '@/lib/utils'
import PublicActivityRow from './PublicActivityRow'

interface PublicActivityTableProps {
  activities: ActivityOrder[]
  rowGridClass: string
  isLoading: boolean
  hasError: boolean
  onRetry: () => void
  isFetchingNextPage: boolean
  isLoadingMore: boolean
  infiniteScrollError: string | null
  onRetryLoadMore: () => void
  loadMoreRef: RefObject<HTMLDivElement | null>
}

export default function PublicActivityTable({
  activities,
  rowGridClass,
  isLoading,
  hasError,
  onRetry,
  isFetchingNextPage,
  isLoadingMore,
  infiniteScrollError,
  onRetryLoadMore,
  loadMoreRef,
}: PublicActivityTableProps) {
  const hasNoData = !isLoading && activities.length === 0

  return (
    <div className="overflow-x-auto">
      <div className="min-w-180">
        <div
          className={cn(
            rowGridClass,
            'px-2 pt-2 pb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:px-3',
          )}
        >
          <div>Activity</div>
          <div>Market</div>
          <div className="text-right">Value</div>
          <div className="text-right text-transparent" aria-hidden>
            <span className="invisible">Time</span>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3 px-2 sm:px-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-14 rounded-lg border border-border/50 bg-muted/30"
              />
            ))}
          </div>
        )}

        {hasError && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Could not load activity.
            {' '}
            <button
              type="button"
              onClick={onRetry}
              className="underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {hasNoData && !hasError && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No activity found.
          </div>
        )}

        {!isLoading && !hasError && activities.length > 0 && (
          <div>
            {activities.map(activity => (
              <PublicActivityRow
                key={activity.id}
                activity={activity}
                rowGridClass={rowGridClass}
              />
            ))}
            {(isFetchingNextPage || isLoadingMore) && (
              <div className="py-3 text-center text-xs text-muted-foreground">Loading more...</div>
            )}
            <div ref={loadMoreRef} />
            {infiniteScrollError && (
              <div className="py-3 text-center text-xs text-no">
                {infiniteScrollError}
                {' '}
                <button
                  type="button"
                  onClick={onRetryLoadMore}
                  className="underline underline-offset-2"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
