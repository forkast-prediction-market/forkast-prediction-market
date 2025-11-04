'use cache'

import { Suspense } from 'react'
import Header from '@/components/Header'
import NavigationTabs from '@/components/NavigationTabs'
import PlatformLayoutSkeleton from '@/components/PlatformLayoutSkeleton'
import { FilterProvider } from '@/providers/FilterProvider'
import { Providers } from '@/providers/Providers'

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
