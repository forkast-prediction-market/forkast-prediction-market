'use client'

import type { TimeRange } from '@/app/(platform)/event/[slug]/_hooks/useEventPriceHistory'
import type { EventChartProps } from '@/app/(platform)/event/[slug]/_types/EventChartTypes'
import type { PredictionChartCursorSnapshot, SeriesConfig } from '@/components/PredictionChart'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  useEventOutcomeChanceChanges,
  useEventOutcomeChances,
  useMarketQuotes,
  useMarketYesPrices,
  useUpdateEventOutcomeChanceChanges,
  useUpdateEventOutcomeChances,
  useUpdateMarketQuotes,
  useUpdateMarketYesPrices,
} from '@/app/(platform)/event/[slug]/_components/EventOutcomeChanceProvider'
import { useEventMarketQuotes } from '@/app/(platform)/event/[slug]/_hooks/useEventMidPrices'
import {
  buildMarketTargets,
  TIME_RANGES,
  useEventPriceHistory,
} from '@/app/(platform)/event/[slug]/_hooks/useEventPriceHistory'
import {
  areNumberMapsEqual,
  areQuoteMapsEqual,
  buildChartSeries,
  buildMarketSignature,
  computeChanceChanges,
  filterChartDataForSeries,
  getMaxSeriesCount,
  getOutcomeLabelForMarket,
  getTopMarketIds,
} from '@/app/(platform)/event/[slug]/_utils/EventChartUtils'
import PredictionChart from '@/components/PredictionChart'
import { OUTCOME_INDEX } from '@/lib/constants'
import { buildChanceByMarket } from '@/lib/market-chance'
import { useIsSingleMarket } from '@/stores/useOrder'
import EventChartControls from './EventChartControls'
import EventChartHeader from './EventChartHeader'
import EventChartLayout from './EventChartLayout'

function EventChartComponent({ event, isMobile }: EventChartProps) {
  const isSingleMarket = useIsSingleMarket()
  const currentOutcomeChances = useEventOutcomeChances()
  const currentOutcomeChanceChanges = useEventOutcomeChanceChanges()
  const currentMarketQuotes = useMarketQuotes()
  const currentMarketYesPrices = useMarketYesPrices()
  const updateOutcomeChances = useUpdateEventOutcomeChances()
  const updateMarketYesPrices = useUpdateMarketYesPrices()
  const updateMarketQuotes = useUpdateMarketQuotes()
  const updateOutcomeChanceChanges = useUpdateEventOutcomeChanceChanges()

  const [activeTimeRange, setActiveTimeRange] = useState<TimeRange>('ALL')
  const [activeOutcomeIndex, setActiveOutcomeIndex] = useState<
    typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO
  >(OUTCOME_INDEX.YES)
  const [cursorSnapshot, setCursorSnapshot] = useState<PredictionChartCursorSnapshot | null>(null)
  const timeRangeContainerRef = useRef<HTMLDivElement | null>(null)
  const [timeRangeIndicator, setTimeRangeIndicator] = useState({ width: 0, left: 0 })
  const [timeRangeIndicatorReady, setTimeRangeIndicatorReady] = useState(false)

  useEffect(() => {
    setCursorSnapshot(null)
  }, [activeTimeRange, event.slug, activeOutcomeIndex])

  const yesMarketTargets = useMemo(
    () => buildMarketTargets(event.markets, OUTCOME_INDEX.YES),
    [event.markets],
  )
  const noMarketTargets = useMemo(
    () => (isSingleMarket ? buildMarketTargets(event.markets, OUTCOME_INDEX.NO) : []),
    [event.markets, isSingleMarket],
  )

  const yesPriceHistory = useEventPriceHistory({
    eventId: event.id,
    range: activeTimeRange,
    targets: yesMarketTargets,
    eventCreatedAt: event.created_at,
  })
  const noPriceHistory = useEventPriceHistory({
    eventId: event.id,
    range: activeTimeRange,
    targets: noMarketTargets,
    eventCreatedAt: event.created_at,
  })
  const marketQuotesByMarket = useEventMarketQuotes(yesMarketTargets)
  const midPricesByMarket = useMemo(
    () => Object.fromEntries(
      Object.entries(marketQuotesByMarket)
        .map(([marketId, quote]) => [marketId, quote.mid])
        .filter(([, value]) => typeof value === 'number' && Number.isFinite(value)),
    ),
    [marketQuotesByMarket],
  )
  const midChanceByMarket = useMemo(
    () => buildChanceByMarket(event.markets, midPricesByMarket),
    [event.markets, midPricesByMarket],
  )
  const chanceChangeByMarket = useMemo(
    () => computeChanceChanges(yesPriceHistory.normalizedHistory),
    [yesPriceHistory.normalizedHistory],
  )

  const chartHistory = isSingleMarket && activeOutcomeIndex === OUTCOME_INDEX.NO
    ? noPriceHistory
    : yesPriceHistory
  const normalizedHistory = chartHistory.normalizedHistory
  const latestSnapshot = chartHistory.latestSnapshot

  useEffect(() => {
    if (Object.keys(yesPriceHistory.latestSnapshot).length > 0) {
      if (areNumberMapsEqual(yesPriceHistory.latestSnapshot, currentOutcomeChances)) {
        return
      }
      updateOutcomeChances(yesPriceHistory.latestSnapshot)
    }
  }, [currentOutcomeChances, yesPriceHistory.latestSnapshot, updateOutcomeChances])

  useEffect(() => {
    if (Object.keys(yesPriceHistory.latestRawPrices).length > 0) {
      if (areNumberMapsEqual(yesPriceHistory.latestRawPrices, currentMarketYesPrices)) {
        return
      }
      updateMarketYesPrices(yesPriceHistory.latestRawPrices)
    }
  }, [currentMarketYesPrices, yesPriceHistory.latestRawPrices, updateMarketYesPrices])

  useEffect(() => {
    if (Object.keys(chanceChangeByMarket).length > 0) {
      if (areNumberMapsEqual(chanceChangeByMarket, currentOutcomeChanceChanges)) {
        return
      }
      updateOutcomeChanceChanges(chanceChangeByMarket)
    }
  }, [chanceChangeByMarket, currentOutcomeChanceChanges, updateOutcomeChanceChanges])

  useEffect(() => {
    if (Object.keys(marketQuotesByMarket).length > 0) {
      if (areQuoteMapsEqual(marketQuotesByMarket, currentMarketQuotes)) {
        return
      }
      updateMarketQuotes(marketQuotesByMarket)
    }
  }, [currentMarketQuotes, marketQuotesByMarket, updateMarketQuotes])

  const topMarketIds = useMemo(
    () => getTopMarketIds(latestSnapshot, getMaxSeriesCount()),
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
      .slice(0, getMaxSeriesCount()),
    [event.markets],
  )

  const fallbackChartSeries = useMemo(
    () => buildChartSeries(event, fallbackMarketIds),
    [event, fallbackMarketIds],
  )

  const baseSeries = useMemo(
    () => (chartSeries.length > 0 ? chartSeries : fallbackChartSeries),
    [chartSeries, fallbackChartSeries],
  )

  const effectiveSeries = useMemo(() => {
    if (!isSingleMarket || baseSeries.length === 0) {
      return baseSeries
    }
    const primaryColor = activeOutcomeIndex === OUTCOME_INDEX.NO ? '#FF6600' : '#2D9CDB'
    return baseSeries.map((seriesItem, index) => (index === 0
      ? { ...seriesItem, color: primaryColor }
      : seriesItem))
  }, [activeOutcomeIndex, baseSeries, isSingleMarket])

  const watermark = useMemo(
    () => ({
      iconSvg: process.env.NEXT_PUBLIC_SITE_LOGO_SVG,
      label: process.env.NEXT_PUBLIC_SITE_NAME,
    }),
    [],
  )

  const legendSeries = effectiveSeries
  const hasLegendSeries = legendSeries.length > 0

  const primaryMarket = useMemo(
    () => {
      const primaryId = legendSeries[0]?.key
      return (primaryId
        ? event.markets.find(market => market.condition_id === primaryId)
        : null) ?? event.markets[0]
    },
    [event.markets, legendSeries],
  )
  const primarySeriesColor = legendSeries[0]?.color ?? 'currentColor'
  const oppositeOutcomeIndex = activeOutcomeIndex === OUTCOME_INDEX.YES
    ? OUTCOME_INDEX.NO
    : OUTCOME_INDEX.YES
  const oppositeOutcomeLabel = getOutcomeLabelForMarket(primaryMarket, oppositeOutcomeIndex)
  const activeOutcomeLabel = getOutcomeLabelForMarket(primaryMarket, activeOutcomeIndex)

  const chartData = useMemo(
    () => filterChartDataForSeries(
      normalizedHistory,
      effectiveSeries.map(series => series.key),
    ),
    [normalizedHistory, effectiveSeries],
  )
  const hasChartData = chartData.length > 0
  const chartSignature = useMemo(() => {
    const seriesKeys = effectiveSeries.map(series => series.key).join(',')
    return `${event.id}:${activeTimeRange}:${activeOutcomeIndex}:${seriesKeys}`
  }, [event.id, activeTimeRange, activeOutcomeIndex, effectiveSeries])

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

  const chartWidth = isMobile ? 400 : 900
  const leadingMarket = legendSeries[0]
  const hoveredYesChance = leadingMarket
    ? cursorSnapshot?.values?.[leadingMarket.key]
    : null
  const latestYesChance = leadingMarket ? latestSnapshot[leadingMarket.key] : null
  const hasMidChanceForLeading = Boolean(
    leadingMarket
    && midPricesByMarket[leadingMarket.key] != null,
  )
  const midYesChance = hasMidChanceForLeading
    ? midChanceByMarket[leadingMarket.key]
    : null
  const midActiveChance = typeof midYesChance === 'number' && Number.isFinite(midYesChance)
    ? (activeOutcomeIndex === OUTCOME_INDEX.NO
        ? Math.max(0, Math.min(100, 100 - midYesChance))
        : midYesChance)
    : null
  const resolvedYesChance = typeof hoveredYesChance === 'number' && Number.isFinite(hoveredYesChance)
    ? hoveredYesChance
    : (typeof midActiveChance === 'number' && Number.isFinite(midActiveChance)
        ? midActiveChance
        : (typeof latestYesChance === 'number' && Number.isFinite(latestYesChance)
            ? latestYesChance
            : null))
  const yesChanceValue = typeof resolvedYesChance === 'number' ? resolvedYesChance : null
  const legendEntriesWithValues = useMemo(
    () => legendEntries.filter(entry => typeof entry.value === 'number' && Number.isFinite(entry.value)),
    [legendEntries],
  )
  const showLegendValues = chartSeries.length > 0 && legendEntriesWithValues.length > 0
  const shouldRenderLegendEntries = showLegendValues
  const cursorYesChance = typeof hoveredYesChance === 'number' && Number.isFinite(hoveredYesChance)
    ? hoveredYesChance
    : null
  const defaultBaselineYesChance = useMemo(() => {
    if (!leadingMarket) {
      return null
    }
    for (const point of chartData) {
      const value = point[leadingMarket.key]
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value
      }
    }
    return null
  }, [chartData, leadingMarket])
  const defaultCurrentYesChance = useMemo(() => {
    if (!leadingMarket) {
      return null
    }
    for (let index = chartData.length - 1; index >= 0; index -= 1) {
      const value = chartData[index]?.[leadingMarket.key]
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value
      }
    }
    return null
  }, [chartData, leadingMarket])
  const isHovering = cursorSnapshot !== null
    && cursorYesChance !== null
    && Number.isFinite(cursorYesChance)
  const effectiveBaselineYesChance = defaultBaselineYesChance
  const effectiveCurrentYesChance = isHovering
    ? cursorYesChance
    : defaultCurrentYesChance

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

  const legendContent = shouldRenderLegendEntries
    ? (
        <div className="flex min-h-5 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          {legendEntriesWithValues.map((entry) => {
            const resolvedValue = entry.value as number
            return (
              <div key={entry.key} className="flex items-center gap-2">
                <div
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="inline-flex w-fit items-center gap-0.5 text-xs font-medium text-muted-foreground">
                  <span>{entry.name}</span>
                  <span className="inline-flex w-6 items-baseline justify-end font-semibold tabular-nums">
                    {resolvedValue.toFixed(0)}
                    <span className="text-2xs">%</span>
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )
    : null

  if (!hasLegendSeries) {
    return null
  }
  return (
    <EventChartLayout
      header={(
        <EventChartHeader
          isSingleMarket={isSingleMarket}
          activeOutcomeIndex={activeOutcomeIndex}
          activeOutcomeLabel={activeOutcomeLabel}
          primarySeriesColor={primarySeriesColor}
          yesChanceValue={yesChanceValue}
          effectiveBaselineYesChance={effectiveBaselineYesChance}
          effectiveCurrentYesChance={effectiveCurrentYesChance}
          watermark={watermark}
        />
      )}
      chart={(
        <PredictionChart
          data={chartData}
          series={legendSeries}
          width={chartWidth}
          height={280}
          margin={{ top: 30, right: 40, bottom: 52, left: 0 }}
          dataSignature={chartSignature}
          onCursorDataChange={setCursorSnapshot}
          xAxisTickCount={isMobile ? 3 : 6}
          legendContent={legendContent}
          showLegend={!isSingleMarket}
          watermark={isSingleMarket ? undefined : watermark}
        />
      )}
      controls={(
        <EventChartControls
          hasChartData={hasChartData}
          timeRanges={TIME_RANGES}
          activeTimeRange={activeTimeRange}
          onTimeRangeChange={setActiveTimeRange}
          timeRangeContainerRef={timeRangeContainerRef}
          timeRangeIndicator={timeRangeIndicator}
          timeRangeIndicatorReady={timeRangeIndicatorReady}
          showOutcomeSwitch={isSingleMarket}
          oppositeOutcomeLabel={oppositeOutcomeLabel}
          onShuffle={() => {
            setActiveOutcomeIndex(oppositeOutcomeIndex)
            setCursorSnapshot(null)
          }}
        />
      )}
    />
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
