'use client'

import type { User } from '@/types'
import { ArrowDownWideNarrow, SearchIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useState } from 'react'
import PortfolioActivityList from '@/app/(platform)/portfolio/_components/PortfolioActivityList'
import PortfolioOpenOrdersTable from '@/app/(platform)/portfolio/_components/PortfolioOpenOrdersTable'
import PortfolioPositionsTable from '@/app/(platform)/portfolio/_components/PortfolioPositionsTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PortfolioTabsProps {
  user: User
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function PortfolioTabs({ user, activeTab, onTabChange }: PortfolioTabsProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const tabs = [
    { id: 'positions', label: 'Positions' },
    { id: 'open-orders', label: 'Open orders' },
    { id: 'history', label: 'History' },
  ]

  function renderTabContent() {
    switch (activeTab) {
      case 'positions':
        return <PortfolioPositionsTable searchQuery={searchQuery} />
      case 'open-orders':
        return <PortfolioOpenOrdersTable searchQuery={searchQuery} />
      case 'history':
        return <PortfolioActivityList user={user} />
      default:
        return <PortfolioPositionsTable searchQuery={searchQuery} />
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab selector */}
      <div className="border-b border-border/50">
        <div className="flex gap-8">
          {tabs.map(tab => (
            <button
              type="button"
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`pb-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar and controls */}
      {activeTab !== 'history' && (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent pl-10 dark:bg-transparent"
            />
          </div>

          {/* Tab-specific controls */}
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            {activeTab === 'positions' && (
              <Button variant="outline" size="sm">
                <ArrowDownWideNarrow className="h-4 w-4" />
                Current value
              </Button>
            )}

            {activeTab === 'open-orders' && (
              <Button variant="outline" size="sm">
                <SlidersHorizontalIcon className="h-4 w-4" />
                Market
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Tab content */}
      {renderTabContent()}
    </div>
  )
}
