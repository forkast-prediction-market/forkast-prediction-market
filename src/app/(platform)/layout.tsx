'use cache'

import { Suspense } from 'react'
import { FilterErrorBoundary } from '@/components/FilterErrorBoundary'
import Header from '@/components/Header'
import NavigationTabs from '@/components/NavigationTabs'
import { FilterProvider } from '@/contexts/FilterContext'
import { Providers } from '@/providers/Providers'

export default async function PlatformLayout({ children }: LayoutProps<'/'>) {
  return (
    <Providers>
      <FilterErrorBoundary>
        <FilterProvider>
          <Header />
          <Suspense fallback={<div>Loading...</div>}>
            <NavigationTabs />
            {children}
          </Suspense>
        </FilterProvider>
      </FilterErrorBoundary>
    </Providers>
  )
}
