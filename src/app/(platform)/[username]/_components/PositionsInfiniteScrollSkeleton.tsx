'use client'

import PositionItemSkeleton from './PositionItemSkeleton'

interface PositionsInfiniteScrollSkeletonProps {
  skeletonCount?: number
}

export default function PositionsInfiniteScrollSkeleton({
  skeletonCount = 3,
}: PositionsInfiniteScrollSkeletonProps) {
  return (
    <div className="border-t">
      <div className="space-y-0">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <PositionItemSkeleton
            key={`infinite-${index}`}
            isInfiniteScroll={true}
          />
        ))}
      </div>
    </div>
  )
}
