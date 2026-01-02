'use client'

import type { TimeRange } from '@/app/(platform)/event/[slug]/_hooks/useEventPriceHistory'
import type { Market, Outcome } from '@/types'
import { useEffect, useMemo, useRef, useState } from 'react'
import EventChartControls from '@/app/(platform)/event/[slug]/_components/EventChartControls'
import {
  buildMarketTargets,
  TIME_RANGES,
  useEventPriceHistory,
} from '@/app/(platform)/event/[slug]/_hooks/useEventPriceHistory'
import PredictionChart from '@/components/PredictionChart'
import { OUTCOME_INDEX } from '@/lib/constants'

interface MarketOutcomeGraphProps {
  market: Market
  outcome: Outcome
  allMarkets: Market[]
  eventCreatedAt: string
  isMobile: boolean
}

export default function MarketOutcomeGraph({ market, outcome, allMarkets, eventCreatedAt, isMobile }: MarketOutcomeGraphProps) {
  const [activeTimeRange, setActiveTimeRange] = useState<TimeRange>('ALL')
  const [activeOutcomeIndex, setActiveOutcomeIndex] = useState(outcome.outcome_index)
  const timeRangeContainerRef = useRef<HTMLDivElement | null>(null)
  const [timeRangeIndicator, setTimeRangeIndicator] = useState({ width: 0, left: 0 })
  const [timeRangeIndicatorReady, setTimeRangeIndicatorReady] = useState(false)
  const marketTargets = useMemo(() => buildMarketTargets(allMarkets), [allMarkets])
  const chartWidth = isMobile ? 400 : 900

  useEffect(() => {
    setActiveOutcomeIndex(outcome.outcome_index)
  }, [outcome.id, outcome.outcome_index])

  useEffect(() => {
    const container = timeRangeContainerRef.current
    if (!container) {
      return
    }
    const target = container.querySelector<HTMLButtonElement>(`button[data-range="${activeTimeRange}"]`)
    if (!target) {
      return
    }
    const { offsetLeft, offsetWidth } = target
    setTimeRangeIndicator({
      width: offsetWidth,
      left: offsetLeft,
    })
    setTimeRangeIndicatorReady(offsetWidth > 0)
  }, [activeTimeRange])

  const activeOutcome = useMemo(
    () => market.outcomes.find(item => item.outcome_index === activeOutcomeIndex) ?? outcome,
    [market.outcomes, activeOutcomeIndex, outcome],
  )
  const oppositeOutcomeIndex = activeOutcomeIndex === OUTCOME_INDEX.YES
    ? OUTCOME_INDEX.NO
    : OUTCOME_INDEX.YES
  const oppositeOutcome = useMemo(
    () => market.outcomes.find(item => item.outcome_index === oppositeOutcomeIndex) ?? activeOutcome,
    [market.outcomes, oppositeOutcomeIndex, activeOutcome],
  )
  const showOutcomeSwitch = market.outcomes.length > 1
    && oppositeOutcome.outcome_index !== activeOutcome.outcome_index

  const {
    normalizedHistory,
  } = useEventPriceHistory({
    eventId: market.event_id,
    range: activeTimeRange,
    targets: marketTargets,
    eventCreatedAt,
  })

  const chartData = useMemo(
    () => buildChartData(normalizedHistory, market.condition_id, activeOutcomeIndex),
    [normalizedHistory, market.condition_id, activeOutcomeIndex],
  )

  const series = useMemo(
    () => [{
      key: 'value',
      name: activeOutcome.outcome_text,
      color: activeOutcome.outcome_index === OUTCOME_INDEX.NO ? '#FF6600' : '#2D9CDB',
    }],
    [activeOutcome.outcome_index, activeOutcome.outcome_text],
  )
  const chartSignature = useMemo(
    () => `${market.condition_id}:${activeOutcomeIndex}:${activeTimeRange}`,
    [market.condition_id, activeOutcomeIndex, activeTimeRange],
  )
  const hasChartData = chartData.length > 0

  if (!hasChartData) {
    return (
      <div className="flex min-h-16 items-center justify-center px-4 text-center text-sm text-muted-foreground">
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
        xAxisTickCount={isMobile ? 3 : 6}
        legendContent={null}
        showLegend={false}
        watermark={{
          iconSvg: process.env.NEXT_PUBLIC_SITE_LOGO_SVG,
          label: process.env.NEXT_PUBLIC_SITE_NAME,
        }}
      />

      <EventChartControls
        hasChartData={hasChartData}
        timeRanges={TIME_RANGES}
        activeTimeRange={activeTimeRange}
        onTimeRangeChange={setActiveTimeRange}
        timeRangeContainerRef={timeRangeContainerRef}
        timeRangeIndicator={timeRangeIndicator}
        timeRangeIndicatorReady={timeRangeIndicatorReady}
        isSingleMarket={showOutcomeSwitch}
        oppositeOutcomeLabel={oppositeOutcome.outcome_text}
        onShuffle={() => setActiveOutcomeIndex(oppositeOutcome.outcome_index)}
      />
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
      const resolvedValue = outcomeIndex === OUTCOME_INDEX.YES
        ? value
        : Math.max(0, 100 - value)
      return {
        date: point.date,
        value: resolvedValue,
      }
    })
    .filter((entry): entry is { date: Date, value: number } => entry !== null)
}
