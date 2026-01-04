import EventsGridSkeleton from '@/components/EventsGridSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <>
      <nav className="sticky top-14 z-10 border-b bg-background">
        <div
          id="navigation-main-tags"
          className="container scrollbar-hide flex gap-6 overflow-x-auto text-sm font-medium"
        >
          <div className="flex items-center">
            <div className={`
              flex cursor-pointer items-center gap-1.5 border-b-2 border-primary py-2 pb-1 whitespace-nowrap
            `}
            >
              <Skeleton className="h-5 w-4 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
            </div>
          </div>

          <div className="flex items-center">
            <div className={`
              flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent py-2 pb-1 whitespace-nowrap
            `}
            >
              <Skeleton className="h-5 w-8 rounded" />
            </div>

            <div className="mr-0 ml-6 h-5 w-px bg-border" />
          </div>

          <div className="flex items-center">
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          <div className="flex items-center">
            <Skeleton className="h-5 w-20 rounded" />
          </div>
          <div className="flex items-center">
            <Skeleton className="h-5 w-14 rounded" />
          </div>
          <div className="flex items-center">
            <Skeleton className="h-5 w-16 rounded" />
          </div>
        </div>
      </nav>

      <div
        id="navigation-tags"
        className="z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
      >
        <div className="container py-4">
          <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto">
            <Skeleton className="h-8 w-full shrink-0 rounded md:w-44 lg:w-52 xl:w-56" />
            <Skeleton className="h-8 w-16 shrink-0 rounded" />
            <Skeleton className="h-8 w-20 shrink-0 rounded" />
            <Skeleton className="h-8 w-14 shrink-0 rounded" />
            <Skeleton className="h-8 w-16 shrink-0 rounded" />
            <Skeleton className="h-8 w-12 shrink-0 rounded" />
          </div>
        </div>
      </div>

      <main className="container grid gap-4 py-4">
        <EventsGridSkeleton />
      </main>
    </>
  )
}
