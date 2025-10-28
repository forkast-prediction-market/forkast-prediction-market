'use client'

import type { User } from '@/types'
import { useState } from 'react'
import PortfolioTabs from '@/app/(platform)/portfolio/_components/PortfolioTabs'
import { Card, CardContent } from '@/components/ui/card'

interface PortfolioContentProps {
  user: User
}

export default function PortfolioContent({ user }: PortfolioContentProps) {
  const [activeTab, setActiveTab] = useState('positions')

  return (
    <Card className="bg-background">
      <CardContent className="p-6">
        <PortfolioTabs user={user} activeTab={activeTab} onTabChange={setActiveTab} />
      </CardContent>
    </Card>
  )
}
