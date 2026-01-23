import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <section className="grid gap-8">
      <div className="grid gap-2">
        <Skeleton className="h-11 w-1/5" />
        <Skeleton className="h-6 w-2/5" />
      </div>

      <div className="mx-auto w-full max-w-2xl lg:mx-0">
        <Skeleton className="h-96 w-full" />
      </div>
    </section>
  )
}
