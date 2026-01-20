import EventCardSkeleton from '@/app/(platform)/(home)/_components/EventCardSkeleton'

interface EventsGridSkeletonProps {
  count?: number
}

export default function EventsGridSkeleton({ count = 12 }: EventsGridSkeletonProps) {
  return (
    <div className="w-full">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }, (_, i) => (
          <EventCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    </div>
  )
}
