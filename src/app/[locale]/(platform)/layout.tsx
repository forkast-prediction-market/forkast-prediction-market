import AffiliateQueryHandler from '@/app/[locale]/(platform)/_components/AffiliateQueryHandler'
import Header from '@/app/[locale]/(platform)/_components/Header'
import NavigationTabs from '@/app/[locale]/(platform)/_components/NavigationTabs'
import { FilterProvider } from '@/app/[locale]/(platform)/_providers/FilterProvider'
import { TradingOnboardingProvider } from '@/app/[locale]/(platform)/_providers/TradingOnboardingProvider'
import { AppProviders } from '@/providers/AppProviders'

export default async function PlatformLayout({ children }: LayoutProps<'/[locale]'>) {
  return (
    <AppProviders>
      <TradingOnboardingProvider>
        <FilterProvider>
          <Header />
          <NavigationTabs />
          {children}
          <AffiliateQueryHandler />
        </FilterProvider>
      </TradingOnboardingProvider>
    </AppProviders>
  )
}
