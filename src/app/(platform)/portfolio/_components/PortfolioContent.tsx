'use client'

import { useState } from 'react'
import PortfolioTabs from '@/app/(platform)/portfolio/_components/PortfolioTabs'
import { Card, CardContent } from '@/components/ui/card'

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
