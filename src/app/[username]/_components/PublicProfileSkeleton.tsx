export default function PublicProfileSkeleton() {
  return (
    <div className="grid animate-pulse gap-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
        <div className="size-28 rounded-full bg-muted" />
        <div className="flex-1 space-y-3">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="h-11 w-24 rounded bg-muted" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map(id => (
          <div key={id} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>

      <div className="grid gap-8">
        <div className="flex space-x-8 border-b border-border">
          <div className="h-10 w-20 rounded bg-muted" />
          <div className="h-10 w-16 rounded bg-muted" />
        </div>
        <div className="h-64 rounded bg-muted/50" />
      </div>
    </div>
  )
}
