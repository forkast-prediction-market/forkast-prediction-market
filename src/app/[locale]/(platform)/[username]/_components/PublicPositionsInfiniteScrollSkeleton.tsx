'use client'

import PublicPositionItemSkeleton from './PublicPositionItemSkeleton'

interface PositionsInfiniteScrollSkeletonProps {
  skeletonCount?: number
}

export default function PublicPositionsInfiniteScrollSkeleton({
  skeletonCount = 3,
}: PositionsInfiniteScrollSkeletonProps) {
  return (
    <div className="border-t">
      <div className="space-y-0">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <PublicPositionItemSkeleton
            key={`infinite-${index}`}
            isInfiniteScroll={true}
          />
        ))}
      </div>
    </div>
  )
}
