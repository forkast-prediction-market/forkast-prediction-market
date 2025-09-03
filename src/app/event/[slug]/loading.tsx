import { Teleport } from '@/components/layout/Teleport'
import { Skeleton } from '@/components/ui/skeleton'
import { EventRelatedSkeleton } from './_components/EventRelatedSkeleton'

export default function Loading() {
  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="size-16 shrink-0" />
        <Skeleton className="h-8 w-full" />

        <div className="ms-auto flex gap-2 text-muted-foreground">
          <Skeleton className="size-4" />
          <Skeleton className="size-4" />
        </div>
      </div>

      <Skeleton className="h-3 w-64" />
      <Skeleton className="mt-4 h-96 w-full" />
      <Skeleton className="mt-6 h-12 w-full" />
      <Skeleton className="mt-3 h-12 w-full" />

      <Teleport to="#event-order-panel">
        <Skeleton className="mt-4 h-72 w-full lg:w-[320px]" />
        <EventRelatedSkeleton />
      </Teleport>
    </>
  )
}
