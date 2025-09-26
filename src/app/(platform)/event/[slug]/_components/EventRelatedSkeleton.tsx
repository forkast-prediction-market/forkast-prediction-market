export default function EventRelatedSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="size-8 rounded bg-muted"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted"></div>
          <div className="h-4 w-1/2 rounded bg-muted"></div>
        </div>
      </div>
    </div>
  )
}
