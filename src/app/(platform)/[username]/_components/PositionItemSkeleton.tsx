'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface PositionItemSkeletonProps {
  isInfiniteScroll?: boolean
}

export default function PositionItemSkeleton({ isInfiniteScroll = false }: PositionItemSkeletonProps) {
  return (
    <div className={`
      flex items-center gap-3 border-b border-border px-3 py-4 transition-colors
      last:border-b-0
      sm:gap-4 sm:px-5
      ${isInfiniteScroll ? 'animate-pulse' : ''}
    `}
    >
      {/* Market */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {/* Market icon skeleton */}
        <Skeleton className="size-10 flex-shrink-0 rounded bg-muted sm:size-12" />

        <div className="min-w-0 flex-1 space-y-2">
          {/* Market title skeleton - varying widths for more realistic look */}
          <Skeleton
            className="h-4"
            style={{
              width: isInfiniteScroll
                ? '60%'
                : '80%',
            }}
          />

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            {/* Status badge skeleton */}
            <Skeleton className="h-6 w-16 rounded-md" />
            {/* Order count skeleton */}
            <Skeleton className="h-3 w-16" />
            {/* Time skeleton - hidden on mobile, shown on desktop */}
            <Skeleton className="hidden h-3 w-12 sm:block" />
          </div>
        </div>
      </div>

      {/* Average Position */}
      <div className="flex-shrink-0 space-y-1 text-right">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-8" />
      </div>

      {/* Total Position Value */}
      <div className="flex-shrink-0 space-y-1 text-right">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-10" />
        {/* Mobile timestamp skeleton */}
        <Skeleton className="h-3 w-12 sm:hidden" />
      </div>
    </div>
  )
}
