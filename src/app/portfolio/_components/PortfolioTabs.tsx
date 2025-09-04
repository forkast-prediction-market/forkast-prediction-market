'use client'

import { ArrowDownWideNarrow, ArrowUpDownIcon, CalendarIcon, DownloadIcon, SearchIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useState } from 'react'
import PortfolioHistoryTable from '@/app/portfolio/_components/PortfolioHistoryTable'
import PortfolioOpenOrdersTable from '@/app/portfolio/_components/PortfolioOpenOrdersTable'
import PortfolioPositionsTable from '@/app/portfolio/_components/PortfolioPositionsTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function PortfolioTabs({ activeTab, onTabChange }: Props) {
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
        return <PortfolioHistoryTable searchQuery={searchQuery} />
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

          {activeTab === 'history' && (
            <>
              <Button variant="outline" size="sm">
                <ArrowUpDownIcon className="h-4 w-4" />
                Newest
              </Button>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <DownloadIcon className="h-4 w-4" />
                Export
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tab content */}
      {renderTabContent()}
    </div>
  )
}
