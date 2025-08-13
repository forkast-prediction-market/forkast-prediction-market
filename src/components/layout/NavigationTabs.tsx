import { Suspense } from 'react'
import NavigationTab from '@/components/layout/NavigationTab'
import { Skeleton } from '@/components/ui/skeleton'
import { getMainTags } from '@/lib/db/tags'

export default async function NavigationTabs() {
  const mainTags = await getMainTags()

  const tags = [
    { slug: 'trending', name: 'Trending', childs: [] },
    { slug: 'new', name: 'New', childs: [] },
    ...mainTags,
  ]

  return (
    <nav className="sticky top-14 z-10 border-b bg-background">
      <div className="container flex gap-6 overflow-x-auto py-1 text-sm font-medium">
        {tags.map((tag, index) => (
          <div key={tag.slug} className="flex items-center">
            <Suspense fallback={<Skeleton className="h-8 w-16 rounded" />}>
              <NavigationTab tag={tag} />
            </Suspense>

            {index === 1 && <div className="mr-0 ml-6 h-4 w-px bg-border" />}
          </div>
        ))}
      </div>
    </nav>
  )
}
