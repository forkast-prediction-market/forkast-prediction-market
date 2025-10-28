'use client'

import type { User } from '@/types'
import { useState } from 'react'
import PortfolioTabs from '@/app/(platform)/portfolio/_components/PortfolioTabs'

interface PortfolioContentProps {
  user: User
}

export default function PortfolioContent({ user }: PortfolioContentProps) {
  const [activeTab, setActiveTab] = useState('positions')

  return (
    <PortfolioTabs user={user} activeTab={activeTab} onTabChange={setActiveTab} />
  )
}
