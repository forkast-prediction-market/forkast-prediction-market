import { Skeleton } from '@/components/ui/skeleton'

interface ProfileLinkSkeletonProps {
  showPosition?: boolean
  showDate?: boolean
  showChildren?: boolean
}

export default function ProfileLinkSkeleton({
  showPosition = false,
  showDate = false,
  showChildren = false,
}: ProfileLinkSkeletonProps) {
  return (
    <div className="flex items-start gap-3 border-b border-border/30 py-2 last:border-b-0">
      <div className="relative shrink-0">
        <Skeleton className="h-8 w-8 rounded-full" />
        {showPosition && (
          <Skeleton className="absolute top-0 -right-2 h-5 w-5 rounded-full" />
        )}
      </div>

      <div className="w-full">
        <div className="flex max-w-32 items-center gap-1 lg:max-w-64">
          <Skeleton className="h-4 w-20" />
          {showDate && <Skeleton className="h-3 w-12" />}
        </div>
        {showChildren && <Skeleton className="mt-1 h-4 w-3/4" />}
      </div>
    </div>
  )
}
