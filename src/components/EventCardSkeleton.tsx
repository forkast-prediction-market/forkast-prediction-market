export default function EventCardSkeleton() {
  return (
    <div className="h-[180px] animate-pulse rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-start gap-2">
        <div className="size-10 rounded bg-muted"></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-3/4 rounded bg-muted"></div>
          <div className="h-3 w-1/2 rounded bg-muted"></div>
        </div>
        <div className="h-12 w-14 rounded bg-muted"></div>
      </div>

      <div className="mt-6 mb-3 grid grid-cols-2 gap-2">
        <div className="h-[48px] rounded bg-muted"></div>
        <div className="h-[48px] rounded bg-muted"></div>
      </div>

      <div className="flex items-center justify-between">
        <div className="h-3 w-16 rounded bg-muted"></div>
        <div className="h-3 w-6 rounded bg-muted"></div>
      </div>
    </div>
  )
}
