'use cache'

import { Suspense } from 'react'
import Header from '@/components/Header'
import NavigationTabs from '@/components/NavigationTabs'
import PlatformLayoutSkeleton from '@/components/PlatformLayoutSkeleton'
import { FilterProvider } from '@/providers/FilterProvider'
import { Providers } from '@/providers/Providers'
import { TradingOnboardingProvider } from '@/providers/TradingOnboardingProvider'

export default async function PlatformLayout({ children }: LayoutProps<'/'>) {
  return (
    <Providers>
      <TradingOnboardingProvider>
        <FilterProvider>
          <Header />
          <Suspense fallback={<PlatformLayoutSkeleton />}>
            <NavigationTabs />
            {children}
          </Suspense>
        </FilterProvider>
      </TradingOnboardingProvider>
    </Providers>
  )
}
