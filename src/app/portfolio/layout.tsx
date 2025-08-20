import PortfolioSummaryCard from '@/app/portfolio/_components/PortfolioSummaryCard'
import ProfitLossCard from '@/app/portfolio/_components/ProfitLossCard'

export default async function PortfolioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="container py-4">
      <div className="mx-auto grid max-w-4xl gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <PortfolioSummaryCard />
          <ProfitLossCard />
        </div>

        {children}
      </div>
    </main>
  )
}
