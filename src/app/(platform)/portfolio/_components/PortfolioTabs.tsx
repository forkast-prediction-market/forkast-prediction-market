'use client'

import type { User } from '@/types'
import { ArrowDownWideNarrow, SearchIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import PortfolioActivityList from '@/app/(platform)/portfolio/_components/PortfolioActivityList'
import PortfolioOpenOrdersTable from '@/app/(platform)/portfolio/_components/PortfolioOpenOrdersTable'
import PortfolioPositionsTable from '@/app/(platform)/portfolio/_components/PortfolioPositionsTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PortfolioTabsProps {
  user: User
  activeTab: string
  onTabChange: (tab: string) => void
}

interface IndicatorStyle {
  left: number
  width: number
}

export default function PortfolioTabs({ user, activeTab, onTabChange }: PortfolioTabsProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Sliding indicator state management
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({ left: 0, width: 0 })
  const [isInitialized, setIsInitialized] = useState(false)

  const tabs = [
    { id: 'positions', label: 'Positions' },
    { id: 'open-orders', label: 'Open orders' },
    { id: 'history', label: 'History' },
  ]

  // Sliding indicator positioning logic
  useLayoutEffect(() => {
    const activeTabIndex = tabs.findIndex(tab => tab.id === activeTab)

    // Bounds checking for activeTabIndex
    if (activeTabIndex < 0 || activeTabIndex >= tabRefs.current.length) {
      return
    }

    const activeTabElement = tabRefs.current[activeTabIndex]

    if (activeTabElement) {
      const { offsetLeft, offsetWidth } = activeTabElement

      // Use queueMicrotask for smooth indicator position updates
      queueMicrotask(() => {
        setIndicatorStyle(prev => ({
          ...prev,
          left: offsetLeft,
          width: offsetWidth,
        }))

        setIsInitialized(prev => prev || true)
      })
    }
  }, [activeTab])

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
      <div className="relative">
        <div className="relative flex space-x-8 border-b border-border">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el
              }}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}

          {/* Sliding indicator */}
          <div
            className={cn(
              'absolute bottom-0 h-0.5 bg-primary',
              isInitialized && 'transition-all duration-300 ease-out',
            )}
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
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
