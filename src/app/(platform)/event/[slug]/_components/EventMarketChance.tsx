'use client'

import type { EventMarketRow } from '@/app/(platform)/event/[slug]/_components/hooks/useEventMarketRows'
import { TriangleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EventMarketChanceProps {
  chanceMeta: EventMarketRow['chanceMeta']
  layout: 'mobile' | 'desktop'
  highlightKey: string
}

export default function EventMarketChance({ chanceMeta, layout, highlightKey }: EventMarketChanceProps) {
  const chanceChangeColorClass = chanceMeta.isChanceChangePositive ? 'text-yes' : 'text-no'

  const baseClass = layout === 'mobile'
    ? 'text-lg font-bold'
    : 'text-3xl font-bold'

  return (
    <div
      className={cn(
        'flex flex-col items-end gap-1',
        layout === 'desktop' && 'flex-row items-center gap-2',
      )}
    >
      <span
        key={`${layout}-chance-${highlightKey}`}
        className={cn(
          baseClass,
          chanceMeta.isSubOnePercent ? 'text-muted-foreground' : 'text-foreground',
          'motion-safe:animate-[pulse_0.8s_ease-out] motion-reduce:animate-none',
        )}
      >
        {chanceMeta.chanceDisplay}
      </span>
      {chanceMeta.shouldShowChanceChange && (
        <div className={cn('flex items-center gap-1 text-xs font-semibold', chanceChangeColorClass)}>
          <TriangleIcon
            className={cn('size-3 fill-current', chanceMeta.isChanceChangePositive ? '' : 'rotate-180')}
            fill="currentColor"
          />
          <span>{chanceMeta.chanceChangeLabel}</span>
        </div>
      )}
    </div>
  )
}
