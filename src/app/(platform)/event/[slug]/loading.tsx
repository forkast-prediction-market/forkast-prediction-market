import EventRelatedSkeleton from '@/app/(platform)/event/[slug]/_components/EventRelatedSkeleton'
import { Teleport } from '@/components/layout/Teleport'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-3 w-64" />

      <div className="flex items-center gap-3">
        <Skeleton className="size-14 shrink-0" />
        <Skeleton className="h-8 w-2/3" />

        <div className="ms-auto flex gap-2 text-muted-foreground">
          <Skeleton className="size-4" />
          <Skeleton className="size-4" />
        </div>
      </div>

      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />

      <Teleport to="#event-order-panel">
        <Skeleton className="mt-4 h-72 w-full lg:w-[320px]" />
        <EventRelatedSkeleton />
      </Teleport>
    </div>
  )
}
