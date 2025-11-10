'use client'

import type { PredictionChartCursorSnapshot, SeriesConfig } from '@/components/PredictionChart'
import type { Event, Market } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { TrendingDownIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  useUpdateEventOutcomeChanceChanges,
  useUpdateEventOutcomeChances,
  useUpdateMarketYesPrices,
} from '@/app/(platform)/event/[slug]/_components/EventOutcomeChanceProvider'
import PredictionChart from '@/components/PredictionChart'
import { OUTCOME_INDEX } from '@/lib/constants'
import { cn, sanitizeSvg } from '@/lib/utils'
import { useIsBinaryMarket } from '@/stores/useOrder'

interface EventChartProps {
  event: Event
  isMobile: boolean
}

type TimeRange = '1H' | '6H' | '1D' | '1W' | '1M' | 'ALL'

interface PriceHistoryPoint {
  t: number
  p: number
}

interface PriceHistoryResponse {
  history?: PriceHistoryPoint[]
}

type PriceHistoryByMarket = Record<string, PriceHistoryPoint[]>

interface MarketTokenTarget {
  market: Market
  tokenId: string
}

interface NormalizedHistoryResult {
  points: Array<Record<string, number | Date> & { date: Date }>
  latestSnapshot: Record<string, number>
  latestRawPrices: Record<string, number>
}

interface RangeFilters {
  fidelity: string
  interval?: string
  startTs?: string
  endTs?: string
}

const CHART_COLORS = ['#FF6600', '#2D9CDB', '#4E6377', '#FDC500']
const TIME_RANGES: TimeRange[] = ['1H', '6H', '1D', '1W', '1M', 'ALL']
const RANGE_CONFIG: Record<Exclude<TimeRange, 'ALL'>, { interval: string, fidelity: number }> = {
  '1H': { interval: '1h', fidelity: 1 },
  '6H': { interval: '6h', fidelity: 1 },
  '1D': { interval: '1d', fidelity: 5 },
  '1W': { interval: '1w', fidelity: 30 },
  '1M': { interval: '1m', fidelity: 180 },
}
const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const CURSOR_STEP_MS: Record<TimeRange, number> = {
  'ALL': 12 * HOUR_MS,
  '1M': 3 * HOUR_MS,
  '1W': 30 * MINUTE_MS,
  '1D': 5 * MINUTE_MS,
  '6H': 1 * MINUTE_MS,
  '1H': 1 * MINUTE_MS,
}
const ALL_FIDELITY = 720
const PRICE_REFRESH_INTERVAL_MS = 60_000
const MAX_SERIES = 4
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000

function clampPrice(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }
  if (value < 0) {
    return 0
  }
  if (value > 1) {
    return 1
  }
  return value
}

function extractYesOutcome(market: Market) {
  return market.outcomes.find(outcome => outcome.outcome_index === OUTCOME_INDEX.YES)
    ?? market.outcomes[OUTCOME_INDEX.YES]
    ?? market.outcomes[0]
}

function buildTimeRangeFilters(range: TimeRange, createdAt: string): RangeFilters {
  if (range === 'ALL') {
    const created = new Date(createdAt)
    const createdSeconds = Number.isFinite(created.getTime())
      ? Math.floor(created.getTime() / 1000)
      : Math.floor(Date.now() / 1000) - (60 * 60 * 24 * 30)
    const nowSeconds = Math.max(createdSeconds + 60, Math.floor(Date.now() / 1000))

    return {
      fidelity: ALL_FIDELITY.toString(),
      startTs: createdSeconds.toString(),
      endTs: nowSeconds.toString(),
    }
  }

  const config = RANGE_CONFIG[range]
  return {
    fidelity: config.fidelity.toString(),
    interval: config.interval,
  }
}

async function fetchTokenPriceHistory(tokenId: string, filters: RangeFilters): Promise<PriceHistoryPoint[]> {
  const url = new URL(`${process.env.CLOB_URL!}/prices-history`)
  url.searchParams.set('market', tokenId)

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value)
    }
  })

  const response = await fetch(url.toString(), { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('Failed to fetch price history')
  }

  const payload = await response.json() as PriceHistoryResponse
  return (payload.history ?? [])
    .map(point => ({
      t: Number(point.t),
      p: Number(point.p),
    }))
    .filter(point => Number.isFinite(point.t) && Number.isFinite(point.p))
}

async function fetchEventPriceHistory(
  targets: MarketTokenTarget[],
  range: TimeRange,
  eventCreatedAt: string,
): Promise<PriceHistoryByMarket> {
  if (!targets.length) {
    return {}
  }

  const filters = buildTimeRangeFilters(range, eventCreatedAt)
  const entries = await Promise.all(
    targets.map(async (target) => {
      try {
        const history = await fetchTokenPriceHistory(target.tokenId, filters)
        return [target.market.condition_id, history] as const
      }
      catch (error) {
        console.error('Failed to load price history for token', target.tokenId, error)
        return [target.market.condition_id, []] as const
      }
    }),
  )

  return Object.fromEntries(entries)
}

function buildNormalizedHistory(historyByMarket: PriceHistoryByMarket): NormalizedHistoryResult {
  const timeline = new Map<number, Map<string, number>>()

  Object.entries(historyByMarket).forEach(([conditionId, history]) => {
    history.forEach((point) => {
      const timestampMs = Math.floor(point.t) * 1000
      if (!timeline.has(timestampMs)) {
        timeline.set(timestampMs, new Map())
      }
      timeline.get(timestampMs)!.set(conditionId, clampPrice(point.p))
    })
  })

  const sortedTimestamps = Array.from(timeline.keys()).sort((a, b) => a - b)
  const lastKnownPrice = new Map<string, number>()
  const points: NormalizedHistoryResult['points'] = []
  const latestRawPrices: Record<string, number> = {}

  sortedTimestamps.forEach((timestamp) => {
    const updates = timeline.get(timestamp)
    updates?.forEach((price, marketKey) => {
      lastKnownPrice.set(marketKey, price)
    })

    if (!lastKnownPrice.size) {
      return
    }

    let total = 0
    lastKnownPrice.forEach((price) => {
      total += price
    })

    if (total <= 0) {
      return
    }

    const point: Record<string, number | Date> & { date: Date } = { date: new Date(timestamp) }
    lastKnownPrice.forEach((price, marketKey) => {
      latestRawPrices[marketKey] = price
      point[marketKey] = (price / total) * 100
    })
    points.push(point)
  })

  const latestSnapshot: Record<string, number> = {}
  const latestPoint = points[points.length - 1]
  if (latestPoint) {
    Object.entries(latestPoint).forEach(([key, value]) => {
      if (key !== 'date' && typeof value === 'number' && Number.isFinite(value)) {
        latestSnapshot[key] = value
      }
    })
  }

  return { points, latestSnapshot, latestRawPrices }
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

function buildChartSeries(event: Event, marketIds: string[]) {
  return marketIds
    .map((conditionId, index) => {
      const market = event.markets.find(current => current.condition_id === conditionId)
      if (!market) {
        return null
      }
      return {
        key: conditionId,
        name: market.short_title || market.title,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }
    })
    .filter((entry): entry is { key: string, name: string, color: string } => entry !== null)
}

export default function EventChart({ event, isMobile }: EventChartProps) {
  const isBinaryMarket = useIsBinaryMarket()
  const updateOutcomeChances = useUpdateEventOutcomeChances()
  const updateMarketYesPrices = useUpdateMarketYesPrices()
  const updateOutcomeChanceChanges = useUpdateEventOutcomeChanceChanges()

  const [activeTimeRange, setActiveTimeRange] = useState<TimeRange>('ALL')
  const [cursorSnapshot, setCursorSnapshot] = useState<PredictionChartCursorSnapshot | null>(null)

  useEffect(() => {
    setCursorSnapshot(null)
  }, [activeTimeRange, event.slug])

  const marketTargets = useMemo<MarketTokenTarget[]>(() => event.markets
    .map((market) => {
      const yesOutcome = extractYesOutcome(market)
      if (!yesOutcome?.token_id) {
        return null
      }
      return {
        market,
        tokenId: yesOutcome.token_id,
      }
    })
    .filter((target): target is MarketTokenTarget => target !== null), [event.markets])

  const tokenSignature = useMemo(
    () => marketTargets.map(target => target.tokenId).sort().join(','),
    [marketTargets],
  )

  const { data: priceHistoryByMarket } = useQuery({
    queryKey: ['event-price-history', event.id, activeTimeRange, tokenSignature],
    queryFn: () => fetchEventPriceHistory(marketTargets, activeTimeRange, event.created_at),
    enabled: marketTargets.length > 0,
    staleTime: PRICE_REFRESH_INTERVAL_MS,
    gcTime: PRICE_REFRESH_INTERVAL_MS,
    refetchInterval: PRICE_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  })

  const { points: normalizedHistory, latestSnapshot, latestRawPrices } = useMemo(
    () => buildNormalizedHistory(priceHistoryByMarket ?? {}),
    [priceHistoryByMarket],
  )
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

  const legendEntries = useMemo<Array<SeriesConfig & { value: number | null }>>(
    () => legendSeries.map((seriesItem) => {
      const hoveredValue = cursorSnapshot?.values?.[seriesItem.key]
      const snapshotValue = latestSnapshot[seriesItem.key]
      const value = typeof hoveredValue === 'number' && Number.isFinite(hoveredValue)
        ? hoveredValue
        : (typeof snapshotValue === 'number' && Number.isFinite(snapshotValue)
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

  return (
    <div className="grid gap-4">
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isBinaryMarket
            ? (
                <>
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
                </>
              )
            : (
                <div className="flex min-h-[20px] flex-wrap items-center gap-4">
                  {shouldRenderLegendEntries
                    ? legendEntries.map((entry) => {
                        const resolvedValue = typeof entry.value === 'number' ? entry.value : 0
                        return (
                          <div key={entry.key} className="flex items-center gap-2">
                            <div
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-xs font-medium text-muted-foreground">
                              {entry.name}
                              {' '}
                              <span className="font-semibold text-muted-foreground">
                                {`${resolvedValue.toFixed(1)}%`}
                              </span>
                            </span>
                          </div>
                        )
                      })
                    : null}
                </div>
              )}
        </div>

        <div className={`
          pointer-events-none absolute top-4 right-4 flex items-center gap-1 text-muted-foreground opacity-50
          select-none
        `}
        >
          <div
            className="size-6 [&_*]:fill-current [&_*]:stroke-current"
            dangerouslySetInnerHTML={{
              __html: sanitizeSvg(process.env.NEXT_PUBLIC_SITE_LOGO_SVG!),
            }}
          />
          <span className="text-xl font-medium">
            {process.env.NEXT_PUBLIC_SITE_NAME}
          </span>
        </div>
      </div>

      <div>
        <div className="relative h-72 w-full">
          <div className="absolute inset-0">
            <PredictionChart
              data={chartData}
              series={chartSeries}
              width={chartWidth}
              height={280}
              margin={{ top: 30, right: 40, bottom: 52, left: 0 }}
              cursorStepMs={CURSOR_STEP_MS[activeTimeRange]}
              onCursorDataChange={setCursorSnapshot}
            />
          </div>
        </div>
        <ul className="mt-2 flex justify-center gap-4 text-[11px] font-medium">
          {TIME_RANGES.map(range => (
            <li
              key={range}
              className={cn(
                'cursor-pointer transition-colors duration-200',
                activeTimeRange === range
                  ? 'border-b-2 border-foreground text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setActiveTimeRange(range)}
            >
              {range}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
