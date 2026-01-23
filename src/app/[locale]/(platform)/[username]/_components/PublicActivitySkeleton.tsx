'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface ActivitySkeletonRowsProps {
  count?: number
}

export function ActivitySkeletonRows({ count = 8 }: ActivitySkeletonRowsProps) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-border px-3 py-4 last:border-b-0 sm:gap-4 sm:px-5"
        >
          <div className="w-12 shrink-0 sm:w-16">
            <Skeleton className="h-4 w-8" />
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Skeleton className="size-10 shrink-0 rounded-lg sm:size-12" />

            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4" style={{ width: '80%' }} />

              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>

          <div className="shrink-0 space-y-1 text-right">
            <Skeleton className="h-4 w-16" />
            <div className="flex items-center justify-end gap-1 sm:gap-2">
              <Skeleton className="hidden h-3 w-12 sm:block" />
              <Skeleton className="size-3" />
            </div>
            <Skeleton className="h-3 w-12 sm:hidden" />
          </div>
        </div>
      ))}
    </div>
  )
}
