'use cache'

import { Suspense } from 'react'
import EventsGridSkeleton from '@/components/EventsGridSkeleton'
import Header from '@/components/Header'
import NavigationTabs from '@/components/NavigationTabs'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterProvider } from '@/providers/FilterProvider'
import { Providers } from '@/providers/Providers'

function PlatformLayoutSkeleton() {
  return (
    <>
      {/* Main navigation tabs skeleton */}
      <nav className="sticky top-14 z-10 border-b bg-background">
        <div
          id="navigation-main-tags"
          className="container scrollbar-hide flex gap-6 overflow-x-auto text-sm font-medium"
        >
          {/* Trending tab with icon */}
          <div className="flex items-center">
            <div className={`
              flex cursor-pointer items-center gap-1.5 border-b-2 border-primary py-2 pb-1 whitespace-nowrap
            `}
            >
              <Skeleton className="h-5 w-4 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
            </div>
          </div>

          {/* New tab */}
          <div className="flex items-center">
            <div className={`
              flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent py-2 pb-1 whitespace-nowrap
            `}
            >
              <Skeleton className="h-5 w-8 rounded" />
            </div>
            {/* Separator after New tab */}
            <div className="mr-0 ml-6 h-5 w-px bg-border" />
          </div>

          {/* Other main category tabs */}
          <div className="flex items-center">
            <Skeleton className="h-5 w-16 rounded" />
          </div>
          <div className="flex items-center">
            <Skeleton className="h-5 w-20 rounded" />
          </div>
          <div className="flex items-center">
            <Skeleton className="h-5 w-14 rounded" />
          </div>
          <div className="flex items-center">
            <Skeleton className="h-5 w-16 rounded" />
          </div>
        </div>
      </nav>

      {/* Sub-navigation tags skeleton (for active tab) */}
      <div
        id="navigation-tags"
        className="z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="container py-4">
          <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto">
            <Skeleton className="h-8 w-full shrink-0 rounded md:w-44 lg:w-52 xl:w-56" />
            <Skeleton className="h-8 w-16 shrink-0 rounded" />
            <Skeleton className="h-8 w-20 shrink-0 rounded" />
            <Skeleton className="h-8 w-14 shrink-0 rounded" />
            <Skeleton className="h-8 w-16 shrink-0 rounded" />
            <Skeleton className="h-8 w-12 shrink-0 rounded" />
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <main className="container grid gap-4 py-4">
        <EventsGridSkeleton />
      </main>
    </>
  )
}

export default async function PlatformLayout({ children }: LayoutProps<'/'>) {
  return (
    <Providers>
      <FilterProvider>
        <Header />
        <Suspense fallback={<PlatformLayoutSkeleton />}>
          <NavigationTabs />
          {children}
        </Suspense>
      </FilterProvider>
    </Providers>
  )
}
