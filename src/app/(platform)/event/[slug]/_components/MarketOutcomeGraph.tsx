'use client'

import type { TimeRange } from '@/app/(platform)/event/[slug]/_components/useEventPriceHistory'
import type { Market, Outcome } from '@/types'
import { useMemo, useState } from 'react'
import {
  buildMarketTargets,
  CURSOR_STEP_MS,
  TIME_RANGES,

  useEventPriceHistory,
} from '@/app/(platform)/event/[slug]/_components/useEventPriceHistory'
import PredictionChart from '@/components/PredictionChart'
import { cn } from '@/lib/utils'

interface MarketOutcomeGraphProps {
  market: Market
  outcome: Outcome
  allMarkets: Market[]
  eventCreatedAt: string
  isMobile: boolean
}

export default function MarketOutcomeGraph({ market, outcome, allMarkets, eventCreatedAt, isMobile }: MarketOutcomeGraphProps) {
  const [activeTimeRange, setActiveTimeRange] = useState<TimeRange>('ALL')
  const marketTargets = useMemo(() => buildMarketTargets(allMarkets), [allMarkets])
  const chartWidth = isMobile ? 400 : 900

  const {
    normalizedHistory,
  } = useEventPriceHistory({
    eventId: market.event_id,
    range: activeTimeRange,
    targets: marketTargets,
    eventCreatedAt,
  })

  const chartData = useMemo(
    () => buildChartData(normalizedHistory, market.condition_id, outcome.outcome_index),
    [normalizedHistory, market.condition_id, outcome.outcome_index],
  )

  const series = useMemo(
    () => [{
      key: 'value',
      name: outcome.outcome_text,
      color: '#2D9CDB',
    }],
    [outcome.outcome_text],
  )
  const chartSignature = useMemo(
    () => `${market.condition_id}:${outcome.id}:${activeTimeRange}`,
    [market.condition_id, outcome.id, activeTimeRange],
  )

  if (chartData.length === 0) {
    return (
      <div className={`
        flex min-h-16 items-center justify-center rounded border border-dashed border-border px-4 text-center text-sm
        text-muted-foreground
      `}
      >
        Price history is unavailable for this outcome.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <PredictionChart
        data={chartData}
        series={series}
        width={chartWidth}
        height={260}
        margin={{ top: 20, right: 40, bottom: 48, left: 0 }}
        dataSignature={chartSignature}
        cursorStepMs={CURSOR_STEP_MS[activeTimeRange]}
        xAxisTickCount={isMobile ? 3 : 6}
        legendContent={null}
        showLegend={false}
        watermark={{
          iconSvg: process.env.NEXT_PUBLIC_SITE_LOGO_SVG,
          label: process.env.NEXT_PUBLIC_SITE_NAME,
        }}
      />

      <div className="flex flex-wrap justify-center gap-2 text-[11px] font-semibold">
        {TIME_RANGES.map(range => (
          <button
            key={range}
            type="button"
            className={cn(
              'rounded-md px-3 py-1 transition-colors',
              activeTimeRange === range
                ? 'bg-muted text-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )}
            onClick={() => setActiveTimeRange(range)}
          >
            {range}
          </button>
        ))}
      </div>
    </div>
  )
}

function buildChartData(
  normalizedHistory: Array<Record<string, number | Date> & { date: Date }>,
  conditionId: string,
  outcomeIndex: number,
) {
  if (!normalizedHistory.length) {
    return []
  }

  return normalizedHistory
    .map((point) => {
      const value = point[conditionId]
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null
      }
      const resolvedValue = outcomeIndex === 0 ? value : Math.max(0, 100 - value)
      return {
        date: point.date,
        value: resolvedValue,
      }
    })
    .filter((entry): entry is { date: Date, value: number } => entry !== null)
}
