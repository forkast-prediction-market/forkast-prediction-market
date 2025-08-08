import { Suspense } from 'react'
import NavigationTab from '@/components/layout/NavigationTab'
import { getMainCategories } from '@/lib/mockData'

export default async function NavigationTabs() {
  const categories = await getMainCategories()

  return (
    <nav className="sticky top-14 z-10 border-b bg-background">
      <div className="container flex gap-6 overflow-x-auto py-1 text-sm font-medium">
        <Suspense>
          {categories.map((category, index) => (
            <div key={category.id} className="flex items-center">
              <NavigationTab category={category} />

              {index === 1 && <div className="mr-0 ml-6 h-4 w-px bg-border" />}
            </div>
          ))}
        </Suspense>
      </div>
    </nav>
  )
}
