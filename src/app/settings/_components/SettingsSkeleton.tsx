import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsSkeleton() {
  return (
    <>
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <nav className="grid gap-1">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
        </nav>
      </aside>
      <div className="mx-auto max-w-2xl lg:mx-0">
        <Skeleton className="h-96 w-full rounded-md" />
      </div>
    </>
  )
}
