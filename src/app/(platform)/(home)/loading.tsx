import EventsGridSkeleton from '@/components/EventsGridSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <>
      <div
        id="navigation-tags"
        className="z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
      >
        <div className="container py-4">
          <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto">
            <Skeleton className="h-9 w-[75%] shrink-0 rounded md:w-44" />
            <Skeleton className="size-9 shrink-0 rounded" />
            <Skeleton className="size-9 shrink-0 rounded" />
          </div>
        </div>
      </div>

      <main className="container grid gap-4 py-4">
        <EventsGridSkeleton />
      </main>
    </>
  )
}
