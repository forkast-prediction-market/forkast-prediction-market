import Header from '@/components/Header'
import NavigationTabs from '@/components/NavigationTabs'
import { AppProviders } from '@/providers/AppProviders'
import { FilterProvider } from '@/providers/FilterProvider'
import { TradingOnboardingProvider } from '@/providers/TradingOnboardingProvider'

export default async function PlatformLayout({ children }: LayoutProps<'/'>) {
  return (
    <AppProviders>
      <TradingOnboardingProvider>
        <FilterProvider>
          <Header />
          <NavigationTabs />
          {children}
        </FilterProvider>
      </TradingOnboardingProvider>
    </AppProviders>
  )
}
