'use client'

import type { MarketQuote } from '@/app/(platform)/event/[slug]/_components/useEventMidPrices'
import type { TimeRange } from '@/app/(platform)/event/[slug]/_components/useEventPriceHistory'
import type { PredictionChartCursorSnapshot, SeriesConfig } from '@/components/PredictionChart'
import type { Event } from '@/types'
import { ShuffleIcon, TriangleIcon } from 'lucide-react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatedCounter } from 'react-animated-counter'
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
import { useEventMarketQuotes } from '@/app/(platform)/event/[slug]/_components/useEventMidPrices'
import {
  buildMarketTargets,
  TIME_RANGES,
  useEventPriceHistory,
} from '@/app/(platform)/event/[slug]/_components/useEventPriceHistory'
import PredictionChart from '@/components/PredictionChart'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { OUTCOME_INDEX } from '@/lib/constants'
import { buildChanceByMarket } from '@/lib/market-chance'
import { cn, sanitizeSvg } from '@/lib/utils'
import { useIsSingleMarket } from '@/stores/useOrder'

interface EventChartProps {
  event: Event
  isMobile: boolean
}

const CHART_COLORS = ['#FF6600', '#2D9CDB', '#4E6377', '#FDC500']
const MAX_SERIES = 4
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000

function areNumberMapsEqual(a: Record<string, number>, b: Record<string, number>) {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) {
    return false
  }
  return aKeys.every(key => Object.is(a[key], b[key]))
}

function areQuoteMapsEqual(a: Record<string, MarketQuote>, b: Record<string, MarketQuote>) {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) {
    return false
  }
  return aKeys.every((key) => {
    const aQuote = a[key]
    const bQuote = b[key]
    if (!aQuote || !bQuote) {
      return false
    }
    return Object.is(aQuote.bid, bQuote.bid)
      && Object.is(aQuote.ask, bQuote.ask)
      && Object.is(aQuote.mid, bQuote.mid)
  })
}

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
  currentOverrides: Record<string, number> = {},
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
    if (key === 'date') {
      return
    }

    const overrideValue = currentOverrides[key]
    const resolvedCurrent = typeof overrideValue === 'number' && Number.isFinite(overrideValue)
      ? overrideValue
      : value
    if (typeof resolvedCurrent !== 'number' || !Number.isFinite(resolvedCurrent)) {
      return
    }

    const baselineValue = baselinePoint[key]
    const numericBaseline = typeof baselineValue === 'number' && Number.isFinite(baselineValue)
      ? baselineValue
      : resolvedCurrent

    changes[key] = resolvedCurrent - numericBaseline
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

function getOutcomeLabelForMarket(
  market: Event['markets'][number] | undefined,
  outcomeIndex: typeof OUTCOME_INDEX.YES | typeof OUTCOME_INDEX.NO,
) {
  const outcome = market?.outcomes.find(item => item.outcome_index === outcomeIndex)
  const label = outcome?.outcome_text?.trim()

  if (label) {
    return label
  }

  return outcomeIndex === OUTCOME_INDEX.YES ? 'Yes' : 'No'
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
    () => computeChanceChanges(yesPriceHistory.normalizedHistory, midChanceByMarket),
    [yesPriceHistory.normalizedHistory, midChanceByMarket],
  )

  const chartHistory = isSingleMarket && activeOutcomeIndex === OUTCOME_INDEX.NO
    ? noPriceHistory
    : yesPriceHistory
  const normalizedHistory = chartHistory.normalizedHistory
  const latestSnapshot = chartHistory.latestSnapshot

  const hasCompleteChanceData = useMemo(
    () => event.markets.every(market => Number.isFinite(latestSnapshot[market.condition_id])),
    [event.markets, latestSnapshot],
  )

  useEffect(() => {
    if (Object.keys(midChanceByMarket).length > 0) {
      if (areNumberMapsEqual(midChanceByMarket, currentOutcomeChances)) {
        return
      }
      updateOutcomeChances(midChanceByMarket)
    }
  }, [currentOutcomeChances, midChanceByMarket, updateOutcomeChances])

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
  const showLegendValues = hasCompleteChanceData && chartSeries.length > 0
  const shouldRenderLegendEntries = showLegendValues && legendEntries.length > 0
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

  if (!hasLegendSeries) {
    return null
  }
  return (
    <div className="grid gap-4">
      {isSingleMarket && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div
              className="flex flex-col gap-1 font-bold tabular-nums"
              style={{ color: primarySeriesColor }}
            >
              {activeOutcomeIndex === OUTCOME_INDEX.NO && activeOutcomeLabel && (
                <span className="text-xs leading-none">
                  {activeOutcomeLabel}
                </span>
              )}
              <div className="inline-flex items-baseline gap-0">
                {typeof yesChanceValue === 'number'
                  ? (
                      <AnimatedCounter
                        value={yesChanceValue}
                        color="currentColor"
                        fontSize="24px"
                        includeCommas={false}
                        includeDecimals={false}
                        incrementColor="currentColor"
                        decrementColor="currentColor"
                        digitStyles={{
                          fontWeight: 800,
                          letterSpacing: '-0.02em',
                          lineHeight: '1',
                          display: 'inline-block',
                        }}
                        containerStyles={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          flexDirection: 'row-reverse',
                          gap: '0.05em',
                          lineHeight: '1',
                        }}
                      />
                    )
                  : (
                      <span className="text-2xl leading-none font-extrabold">--</span>
                    )}
                <span className="text-2xl leading-none font-extrabold">
                  % chance
                </span>
              </div>
            </div>

            {(() => {
              if (
                effectiveBaselineYesChance === null
                || effectiveCurrentYesChance === null
                || !Number.isFinite(effectiveBaselineYesChance)
                || !Number.isFinite(effectiveCurrentYesChance)
              ) {
                return null
              }

              const rawChange = effectiveCurrentYesChance - effectiveBaselineYesChance
              const roundedChange = Math.round(rawChange)

              if (roundedChange === 0) {
                return null
              }

              const isPositive = roundedChange > 0
              const magnitude = Math.abs(roundedChange)
              const colorClass = isPositive ? 'text-emerald-500' : 'text-red-500'

              return (
                <div className={`flex items-center gap-1 tabular-nums ${colorClass}`}>
                  <TriangleIcon
                    className="size-3.5"
                    fill="currentColor"
                    stroke="none"
                    style={{ transform: isPositive ? 'rotate(0deg)' : 'rotate(180deg)' }}
                  />
                  <span className="text-xs font-semibold">
                    {magnitude}
                    %
                  </span>
                </div>
              )
            })()}
          </div>

          {(watermark.iconSvg || watermark.label) && (
            <div className="flex items-center gap-1 self-start text-muted-foreground opacity-50 select-none">
              {watermark.iconSvg
                ? (
                    <div
                      className="size-6 **:fill-current **:stroke-current"
                      dangerouslySetInnerHTML={{ __html: sanitizeSvg(watermark.iconSvg) }}
                    />
                  )
                : null}
              {watermark.label
                ? (
                    <span className="text-xl font-medium">
                      {watermark.label}
                    </span>
                  )
                : null}
            </div>
          )}
        </div>
      )}

      <div>
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
        {hasChartData && (
          <div className="relative mt-3 flex flex-wrap items-center justify-between gap-3">
            <div
              ref={timeRangeContainerRef}
              className="relative flex flex-wrap items-center gap-2 text-xs font-semibold"
            >
              <div
                className={cn(
                  'absolute inset-y-0 rounded-md bg-muted',
                  timeRangeIndicatorReady ? 'opacity-100 transition-all duration-300' : 'opacity-0 transition-none',
                )}
                style={{
                  width: `${timeRangeIndicator.width}px`,
                  left: `${timeRangeIndicator.left}px`,
                }}
                aria-hidden={!timeRangeIndicatorReady}
              />
              {TIME_RANGES.map(range => (
                <button
                  key={range}
                  type="button"
                  className={cn(
                    'relative z-10 rounded-md px-3 py-2 transition-colors',
                    activeTimeRange === range
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  data-range={range}
                  onClick={() => setActiveTimeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>

            {isSingleMarket && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`
                      flex items-center justify-center rounded-md px-3 py-2 text-xs font-semibold text-muted-foreground
                      transition-colors
                      hover:bg-muted/70 hover:text-foreground
                    `}
                    onClick={() => {
                      setActiveOutcomeIndex(oppositeOutcomeIndex)
                      setCursorSnapshot(null)
                    }}
                    aria-label={`switch to ${oppositeOutcomeLabel}`}
                  >
                    <ShuffleIcon className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="left"
                  sideOffset={8}
                  hideArrow
                  className={`
                    border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-xl
                  `}
                >
                  switch to
                  {' '}
                  {oppositeOutcomeLabel}
                </TooltipContent>
              </Tooltip>
            )}
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
