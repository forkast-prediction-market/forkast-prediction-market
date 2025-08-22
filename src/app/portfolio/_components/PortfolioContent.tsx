'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import PortfolioTabs from './PortfolioTabs'

export default function PortfolioContent() {
  const [activeTab, setActiveTab] = useState('positions')

  return (
    <Card className="bg-background">
      <CardContent className="p-6">
        <PortfolioTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </CardContent>
    </Card>
  )
}
