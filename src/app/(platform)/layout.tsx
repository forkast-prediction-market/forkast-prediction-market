import Header from '@/components/Header'
import NavigationTabs from '@/components/NavigationTabs'
import { FilterProvider } from '@/providers/FilterProvider'
import { Providers } from '@/providers/Providers'
import { TradingOnboardingProvider } from '@/providers/TradingOnboardingProvider'

export default async function PlatformLayout({ children }: LayoutProps<'/'>) {
  return (
    <Providers>
      <TradingOnboardingProvider>
        <FilterProvider>
          <Header />
          <NavigationTabs />
          {children}
        </FilterProvider>
      </TradingOnboardingProvider>
    </Providers>
  )
}
