'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import PublicHistoryList from '@/app/(platform)/[username]/_components/PublicHistoryList'
import PublicPositionsList from '@/app/(platform)/[username]/_components/PublicPositionsList'
import PortfolioOpenOrdersList from '@/app/(platform)/portfolio/_components/PortfolioOpenOrdersList'
import { cn } from '@/lib/utils'
import { useUser } from '@/stores/useUser'

type TabType = 'positions' | 'openOrders' | 'history'

const baseTabs = [
  { id: 'positions' as const, label: 'Positions' },
  { id: 'openOrders' as const, label: 'Open orders' },
  { id: 'history' as const, label: 'History' },
]

interface PublicProfileTabsProps {
  userAddress: string
}

export default function PublicProfileTabs({ userAddress }: PublicProfileTabsProps) {
  const user = useUser()
  const [activeTab, setActiveTab] = useState<TabType>('positions')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const [isInitialized, setIsInitialized] = useState(false)
  const canShowOpenOrders = Boolean(
    user?.proxy_wallet_address
    && userAddress
    && user.proxy_wallet_address.toLowerCase() === userAddress.toLowerCase(),
  )
  const tabs = useMemo(
    () => (canShowOpenOrders ? baseTabs : baseTabs.filter(tab => tab.id !== 'openOrders')),
    [canShowOpenOrders],
  )

  useEffect(() => {
    if (!canShowOpenOrders && activeTab === 'openOrders') {
      setActiveTab('positions')
    }
  }, [activeTab, canShowOpenOrders])

  useLayoutEffect(() => {
    const activeTabIndex = tabs.findIndex(tab => tab.id === activeTab)
    const activeTabElement = tabRefs.current[activeTabIndex]

    if (activeTabElement) {
      const { offsetLeft, offsetWidth } = activeTabElement

      queueMicrotask(() => {
        setIndicatorStyle(prev => ({
          ...prev,
          left: offsetLeft,
          width: offsetWidth,
        }))

        setIsInitialized(prev => prev || true)
      })
    }
  }, [activeTab, tabs])

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80">
      <div className="relative">
        <div className="flex items-center gap-6 px-4 pt-4 sm:px-6">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el
              }}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative pb-3 text-sm font-semibold transition-colors',
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-px bg-border/80" />
        <div
          className={cn(
            'pointer-events-none absolute bottom-0 h-0.5 bg-primary',
            isInitialized && 'transition-all duration-300 ease-out',
          )}
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      </div>

      <div className="space-y-4 px-0 pt-4 pb-0 sm:px-0">
        {activeTab === 'positions' && <PublicPositionsList userAddress={userAddress} />}
        {activeTab === 'openOrders' && <PortfolioOpenOrdersList userAddress={userAddress} />}
        {activeTab === 'history' && <PublicHistoryList userAddress={userAddress} />}
      </div>
    </div>
  )
}
