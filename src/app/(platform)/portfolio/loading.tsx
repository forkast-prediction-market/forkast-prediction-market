import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="container py-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-lg border border-border/60" />
          <Skeleton className="h-40 rounded-lg border border-border/60" />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-3 rounded-lg border border-border/60 p-4">
            {[0, 1, 2, 3, 4].map(item => (
              <div key={item} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
