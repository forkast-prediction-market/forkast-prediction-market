'use client'

import type { TimeRange } from '@/app/(platform)/event/[slug]/_components/useEventPriceHistory'
import type { PredictionChartCursorSnapshot, SeriesConfig } from '@/components/PredictionChart'
import type { Event } from '@/types'
import { TrendingDownIcon } from 'lucide-react'
import { memo, useEffect, useMemo, useState } from 'react'
import {
  useUpdateEventOutcomeChanceChanges,
  useUpdateEventOutcomeChances,
  useUpdateMarketYesPrices,
} from '@/app/(platform)/event/[slug]/_components/EventOutcomeChanceProvider'
import {
  buildMarketTargets,
  CURSOR_STEP_MS,
  TIME_RANGES,
  useEventPriceHistory,
} from '@/app/(platform)/event/[slug]/_components/useEventPriceHistory'
import PredictionChart from '@/components/PredictionChart'
import { cn } from '@/lib/utils'
import { useIsSingleMarket } from '@/stores/useOrder'

interface EventChartProps {
  event: Event
  isMobile: boolean
}

const CHART_COLORS = ['#FF6600', '#2D9CDB', '#4E6377', '#FDC500']
const MAX_SERIES = 4
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000

function buildMarketSignature(event: Event) {
  return event.markets
    .map((market) => {
      const outcomeSignature = market.outcomes
        .map(outcome => `${outcome.id}:${outcome.updated_at}:${outcome.token_id}`)
        .join(',')
      return `${market.condition_id}:${market.updated_at}:${outcomeSignature}`
    })
    .join('|')
}

function computeChanceChanges(
  points: Array<Record<string, number | Date> & { date: Date }>,
) {
  if (!points.length) {
    return {}
  }

  const latestPoint = points[points.length - 1]
  const targetTime = latestPoint.date.getTime() - TWELVE_HOURS_MS
  let baselinePoint = points[0]

  for (let index = points.length - 1; index >= 0; index -= 1) {
    const currentPoint = points[index]
    if (currentPoint.date.getTime() <= targetTime) {
      baselinePoint = currentPoint
      break
    }
  }

  const changes: Record<string, number> = {}

  Object.entries(latestPoint).forEach(([key, value]) => {
    if (key === 'date' || typeof value !== 'number' || !Number.isFinite(value)) {
      return
    }

    const baselineValue = baselinePoint[key]
    const numericBaseline = typeof baselineValue === 'number' && Number.isFinite(baselineValue)
      ? baselineValue
      : value

    changes[key] = value - numericBaseline
  })

  return changes
}

function filterChartDataForSeries(
  points: Array<Record<string, number | Date> & { date: Date }>,
  seriesKeys: string[],
) {
  if (!points.length || !seriesKeys.length) {
    return []
  }

  return points.map((point) => {
    const filtered: Record<string, number | Date> & { date: Date } = { date: point.date }
    seriesKeys.forEach((key) => {
      if (typeof point[key] === 'number') {
        filtered[key] = point[key]
      }
    })
    return filtered
  })
}

function getTopMarketIds(chances: Record<string, number>, limit: number) {
  return Object.entries(chances)
    .filter(([, value]) => Number.isFinite(value))
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key]) => key)
}

function isDefaultMarketLabel(label?: string | null) {
  if (!label) {
    return true
  }
  return /^(?:outcome|token)\s*\d+$/i.test(label.trim())
}

function deriveSeriesName(market: Event['markets'][number]) {
  const outcomeLabel = market.outcomes?.[0]?.outcome_text?.trim()
  const shortTitle = market.short_title?.trim()

  if (shortTitle && !isDefaultMarketLabel(shortTitle)) {
    return shortTitle
  }

  if (outcomeLabel) {
    return outcomeLabel
  }

  return market.title
}

function buildChartSeries(event: Event, marketIds: string[]) {
  return marketIds
    .map((conditionId, index) => {
      const market = event.markets.find(current => current.condition_id === conditionId)
      if (!market) {
        return null
      }
      return {
        key: conditionId,
        name: deriveSeriesName(market),
        color: CHART_COLORS[index % CHART_COLORS.length],
      }
    })
    .filter((entry): entry is { key: string, name: string, color: string } => entry !== null)
}

function EventChartComponent({ event, isMobile }: EventChartProps) {
  const isSingleMarket = useIsSingleMarket()
  const updateOutcomeChances = useUpdateEventOutcomeChances()
  const updateMarketYesPrices = useUpdateMarketYesPrices()
  const updateOutcomeChanceChanges = useUpdateEventOutcomeChanceChanges()

  const [activeTimeRange, setActiveTimeRange] = useState<TimeRange>('ALL')
  const [cursorSnapshot, setCursorSnapshot] = useState<PredictionChartCursorSnapshot | null>(null)

  useEffect(() => {
    setCursorSnapshot(null)
  }, [activeTimeRange, event.slug])

  const marketTargets = useMemo(() => buildMarketTargets(event.markets), [event.markets])

  const {
    normalizedHistory,
    latestSnapshot,
    latestRawPrices,
  } = useEventPriceHistory({
    eventId: event.id,
    range: activeTimeRange,
    targets: marketTargets,
    eventCreatedAt: event.created_at,
  })
  const chanceChangeByMarket = useMemo(
    () => computeChanceChanges(normalizedHistory),
    [normalizedHistory],
  )

  const hasCompleteChanceData = useMemo(
    () => event.markets.every(market => Number.isFinite(latestSnapshot[market.condition_id])),
    [event.markets, latestSnapshot],
  )

  useEffect(() => {
    if (Object.keys(latestSnapshot).length > 0) {
      updateOutcomeChances(latestSnapshot)
    }
  }, [latestSnapshot, updateOutcomeChances])

  useEffect(() => {
    if (Object.keys(latestRawPrices).length > 0) {
      updateMarketYesPrices(latestRawPrices)
    }
  }, [latestRawPrices, updateMarketYesPrices])

  useEffect(() => {
    if (Object.keys(chanceChangeByMarket).length > 0) {
      updateOutcomeChanceChanges(chanceChangeByMarket)
    }
  }, [chanceChangeByMarket, updateOutcomeChanceChanges])

  const topMarketIds = useMemo(
    () => getTopMarketIds(latestSnapshot, MAX_SERIES),
    [latestSnapshot],
  )

  const chartSeries = useMemo(
    () => buildChartSeries(event, topMarketIds),
    [event, topMarketIds],
  )

  const fallbackMarketIds = useMemo(
    () => event.markets
      .map(market => market.condition_id)
      .filter((conditionId): conditionId is string => Boolean(conditionId))
      .slice(0, MAX_SERIES),
    [event.markets],
  )

  const fallbackChartSeries = useMemo(
    () => buildChartSeries(event, fallbackMarketIds),
    [event, fallbackMarketIds],
  )

  const legendSeries = chartSeries.length > 0 ? chartSeries : fallbackChartSeries

  const chartData = useMemo(
    () => filterChartDataForSeries(
      normalizedHistory,
      chartSeries.map(series => series.key),
    ),
    [normalizedHistory, chartSeries],
  )
  const hasChartData = chartData.length > 0
  const chartSignature = useMemo(() => {
    const seriesKeys = chartSeries.map(series => series.key).join(',')
    return `${event.id}:${activeTimeRange}:${seriesKeys}`
  }, [event.id, activeTimeRange, chartSeries])

  const legendEntries = useMemo<Array<SeriesConfig & { value: number | null }>>(
    () => legendSeries.map((seriesItem) => {
      const hoveredValue = cursorSnapshot?.values?.[seriesItem.key]
      const snapshotValue = latestSnapshot[seriesItem.key]
      const value = typeof hoveredValue === 'number' && Number.isFinite(hoveredValue)
        ? hoveredValue
        : (Number.isFinite(snapshotValue)
            ? snapshotValue
            : null)
      return { ...seriesItem, value }
    }),
    [legendSeries, cursorSnapshot, latestSnapshot],
  )

  if (legendSeries.length === 0) {
    return null
  }

  const chartWidth = isMobile ? 400 : 900
  const leadingMarket = legendSeries[0]
  const yesChance = leadingMarket ? latestSnapshot[leadingMarket.key] : undefined
  const roundedYesChance = typeof yesChance === 'number' && Number.isFinite(yesChance)
    ? Math.round(yesChance)
    : null
  const roundedNoChance = typeof roundedYesChance === 'number'
    ? Math.max(0, Math.min(100, 100 - roundedYesChance))
    : null
  const showLegendValues = hasCompleteChanceData && chartSeries.length > 0
  const shouldRenderLegendEntries = showLegendValues && legendEntries.length > 0
  const yesChanceDisplay = typeof roundedYesChance === 'number' ? roundedYesChance : '--'
  const noChanceDisplay = typeof roundedNoChance === 'number' ? roundedNoChance : '--'
  const legendContent = shouldRenderLegendEntries
    ? (
        <div className="flex min-h-5 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          {legendEntries.map((entry) => {
            const resolvedValue = typeof entry.value === 'number' ? entry.value : 0

            return (
              <div key={entry.key} className="flex items-center gap-2">
                <div
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="inline-flex w-fit items-center gap-0.5 text-xs font-medium text-muted-foreground">
                  <span>{entry.name}</span>
                  <span className="font-semibold">
                    {resolvedValue.toFixed(1)}
                    %
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )
    : null

  return (
    <div className="grid gap-4">
      {isSingleMarket && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <span className="inline-flex items-center gap-1 text-xl font-bold text-primary">
            {yesChanceDisplay}
            % chance
          </span>

          <div className="flex items-center gap-1 text-no">
            <TrendingDownIcon className="size-4" />
            <span className="text-xs font-semibold">
              {noChanceDisplay}
              %
            </span>
          </div>
        </div>
      )}

      <div>
        <PredictionChart
          data={chartData}
          series={chartSeries}
          width={chartWidth}
          height={280}
          margin={{ top: 30, right: 40, bottom: 52, left: 0 }}
          dataSignature={chartSignature}
          cursorStepMs={CURSOR_STEP_MS[activeTimeRange]}
          onCursorDataChange={setCursorSnapshot}
          xAxisTickCount={isMobile ? 3 : 6}
          legendContent={legendContent}
          showLegend={!isSingleMarket}
          watermark={{
            iconSvg: process.env.NEXT_PUBLIC_SITE_LOGO_SVG,
            label: process.env.NEXT_PUBLIC_SITE_NAME,
          }}
        />
        {hasChartData && (
          <div className="relative z-10 mt-3 flex flex-wrap justify-center gap-2 text-2xs font-medium">
            {TIME_RANGES.map(range => (
              <button
                key={range}
                type="button"
                className={cn(
                  'rounded-md px-3 py-2 transition-colors',
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
        )}
      </div>
    </div>
  )
}

function areChartPropsEqual(prev: EventChartProps, next: EventChartProps) {
  if (prev.isMobile !== next.isMobile) {
    return false
  }
  if (prev.event.id !== next.event.id) {
    return false
  }
  if (prev.event.updated_at !== next.event.updated_at) {
    return false
  }

  return buildMarketSignature(prev.event) === buildMarketSignature(next.event)
}

export default memo(EventChartComponent, areChartPropsEqual)
