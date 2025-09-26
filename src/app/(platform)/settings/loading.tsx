import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <>
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <nav className="grid gap-1">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </nav>
      </aside>
      <div className="mx-auto max-w-2xl lg:mx-0">
        <Skeleton className="h-96 w-full" />
      </div>
    </>
  )
}
