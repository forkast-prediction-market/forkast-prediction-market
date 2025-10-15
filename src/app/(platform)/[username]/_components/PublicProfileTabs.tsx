'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import PublicActivityList from '@/app/(platform)/[username]/_components/PublicActivityList'
import PublicPositionsEmpty from '@/app/(platform)/[username]/_components/PublicPositionsEmpty'
import { cn, sanitizeSvg } from '@/lib/utils'

interface Props {
  userAddress: string
}

type TabType = 'positions' | 'activity'

const tabs = [
  { id: 'positions' as const, label: 'Positions' },
  { id: 'activity' as const, label: 'Activity' },
]

export default function PublicProfileTabs({ userAddress }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('positions')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const [isInitialized, setIsInitialized] = useState(false)

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
  }, [activeTab])

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="relative">
        <div className="relative flex space-x-8 border-b border-border">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el
              }}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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

          {/* Animated indicator */}
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

        <div className="pointer-events-none absolute top-0 right-0">
          <div className="flex items-center gap-2 text-muted-foreground opacity-40 select-none">
            <div
              className="size-6"
              dangerouslySetInnerHTML={{
                __html: sanitizeSvg(process.env.NEXT_PUBLIC_SITE_LOGO_SVG!),
              }}
            />
            <span className="text-2xl font-bold">
              {process.env.NEXT_PUBLIC_SITE_NAME}
            </span>
          </div>
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'positions' && <PublicPositionsEmpty />}
        {activeTab === 'activity' && <PublicActivityList userAddress={userAddress} />}
      </div>
    </div>
  )
}
