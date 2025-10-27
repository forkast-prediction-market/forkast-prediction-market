'use cache'

import PortfolioMarketsWonCard from '@/app/(platform)/portfolio/_components/PortfolioMarketsWonCard'
import PortfolioProfitLossCard from '@/app/(platform)/portfolio/_components/PortfolioProfitLossCard'
import PortfolioSummaryCard from '@/app/(platform)/portfolio/_components/PortfolioSummaryCard'

export default async function PortfolioLayout({ children }: LayoutProps<'/portfolio'>) {
  return (
    <main className="container py-8">
      <div className="mx-auto grid max-w-4xl gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <PortfolioSummaryCard />
          <PortfolioProfitLossCard />
        </div>

        {/* TODO: Wire PortfolioMarketsWonCard to real claimable wins data and hide this block when nothing is available to claim. */}
        <PortfolioMarketsWonCard />

        {children}
      </div>
    </main>
  )
}
