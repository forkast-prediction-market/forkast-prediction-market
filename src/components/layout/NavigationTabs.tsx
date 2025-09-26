import { Suspense } from 'react'
import NavigationTab from '@/components/layout/NavigationTab'
import { Skeleton } from '@/components/ui/skeleton'
import { TagModel } from '@/lib/db/tags'

export default async function NavigationTabs() {
  const { data, globalChilds = [] } = await TagModel.getMainTags()

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
    <nav className="sticky top-14 z-10 border-b bg-background">
      <div className="container scrollbar-hide flex gap-6 overflow-x-auto py-1 text-sm font-medium">
        {tags.map((tag, index) => (
          <div key={tag.slug} className="flex items-center">
            <Suspense fallback={<Skeleton className="h-8 w-16 rounded" />}>
              <NavigationTab tag={tag} childParentMap={childParentMap} />
            </Suspense>

            {index === 1 && <div className="mr-0 ml-6 h-4 w-px bg-border" />}
          </div>
        ))}
      </div>
    </nav>
  )
}
