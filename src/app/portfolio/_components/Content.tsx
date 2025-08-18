'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import PortfolioSummaryCard from './PortfolioSummaryCard'
import PortfolioTabs from './PortfolioTabs'
import ProfitLossCard from './ProfitLossCard'

export default function Content() {
  const [activeTab, setActiveTab] = useState('positions')

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <PortfolioSummaryCard />
        <ProfitLossCard />
      </div>

      <Card className="bg-background">
        <CardContent className="p-6">
          <PortfolioTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </CardContent>
      </Card>
    </>
  )
}
