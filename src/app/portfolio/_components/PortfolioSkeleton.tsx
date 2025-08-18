import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsSkeleton() {
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>

      <Skeleton className="h-96 w-full" />
    </>
  )
}
