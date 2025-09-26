'use client'

import type { ActivityItem } from '@/types'
import { useState } from 'react'
import PublicActivityList from '@/app/(platform)/[username]/_components/PublicActivityList'
import PublicPositionsEmpty from '@/app/(platform)/[username]/_components/PublicPositionsEmpty'
import { cn, sanitizeSvg } from '@/lib/utils'

interface Props {
  activity: ActivityItem[]
}

type TabType = 'positions' | 'activity'

const tabs = [
  { id: 'positions' as const, label: 'Positions' },
  { id: 'activity' as const, label: 'Activity' },
]

export default function PublicProfileTabs({ activity }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('positions')

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="relative">
        <div className="flex space-x-8 border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Forkast Watermark */}
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

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'positions' && <PublicPositionsEmpty />}
        {activeTab === 'activity' && <PublicActivityList activity={activity} />}
      </div>
    </div>
  )
}
