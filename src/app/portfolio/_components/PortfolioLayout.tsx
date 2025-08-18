'use client'

import { useState } from 'react'
import PortfolioSummaryCard from './PortfolioSummaryCard'
import PortfolioTabs from './PortfolioTabs'
import ProfitLossCard from './ProfitLossCard'

export default function PortfolioLayout() {
  const [activeTab, setActiveTab] = useState('positions')

  return (
    <main className="container py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl px-4">
          {/* Cards superiores em grid */}
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <PortfolioSummaryCard />
            <ProfitLossCard />
          </div>

          {/* Seção de tabs e tabelas com borda */}
          <div className="rounded-lg border bg-background">
            <div className="p-6">
              <PortfolioTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          </div>
        </div>
      </div>

      {/* Hidden element to capture teleported content */}
      <div id="navigation-tags" style={{ display: 'none' }} />
    </main>
  )
}
