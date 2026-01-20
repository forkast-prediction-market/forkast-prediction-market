import Header from '@/app/(platform)/_components/Header'
import NavigationTabs from '@/app/(platform)/_components/NavigationTabs'
import { FilterProvider } from '@/app/(platform)/_providers/FilterProvider'
import { TradingOnboardingProvider } from '@/app/(platform)/_providers/TradingOnboardingProvider'
import { AppProviders } from '@/providers/AppProviders'

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
