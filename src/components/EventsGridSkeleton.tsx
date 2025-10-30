import EventCardSkeleton from '@/components/EventCardSkeleton'

interface EventsGridSkeletonProps {
  count?: number
}

export default function EventsGridSkeleton({ count = 12 }: EventsGridSkeletonProps) {
  return (
    <div className="w-full">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: count }, (_, i) => (
          <EventCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    </div>
  )
}
