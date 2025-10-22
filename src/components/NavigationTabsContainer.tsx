import { Suspense } from 'react'
import NavigationTabs from '@/components/NavigationTabs'
import { Skeleton } from '@/components/ui/skeleton'
import { TagRepository } from '@/lib/db/queries/tag'

export default async function NavigationTabsContainer() {
  const { data, globalChilds = [] } = await TagRepository.getMainTags()

  const sharedChilds = globalChilds.map(child => ({ ...child }))
  const baseTags = (data ?? []).map(tag => ({
    ...tag,
    childs: (tag.childs ?? []).map(child => ({ ...child })),
  }))

  const childParentMap = Object.fromEntries(
    baseTags.flatMap(tag => tag.childs.map(child => [child.slug, tag.slug])),
  ) as Record<string, string>

  const tags = [
    { slug: 'trending', name: 'Trending', childs: sharedChilds },
    { slug: 'new', name: 'New', childs: sharedChilds.map(child => ({ ...child })) },
    ...baseTags,
  ]

  return (
    <Suspense fallback={<NavigationTabsSkeleton />}>
      <NavigationTabs tags={tags} childParentMap={childParentMap} />
    </Suspense>
  )
}

function NavigationTabsSkeleton() {
  return (
    <nav className="sticky top-14 z-10 border-b bg-background">
      <div className="container scrollbar-hide flex gap-6 overflow-x-auto py-1 text-sm font-medium">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center">
            <Skeleton className="h-8 w-16 rounded" />
            {index === 1 && <div className="mr-0 ml-6 h-4 w-px bg-border" />}
          </div>
        ))}
      </div>
    </nav>
  )
}
