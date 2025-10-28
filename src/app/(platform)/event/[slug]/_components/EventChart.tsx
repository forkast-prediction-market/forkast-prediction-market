import type { Event, OutcomeRecentTrade } from '@/types'
import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import PredictionChart from '@/components/PredictionChart'
import { OUTCOME_INDEX } from '@/lib/constants'
import { cn, sanitizeSvg } from '@/lib/utils'
import { useIsBinaryMarket, useYesPrice } from '@/stores/useOrder'

interface EventChartProps {
  event: Event
}

interface ChartDataPoint { date: Date, [key: string]: number | Date }

interface SeriesSource {
  key: string
  name: string
  color: string
  trades: OutcomeRecentTrade[]
  fallbackValue: number
  fallbackTime: number
}

const POLYMARKET_COLORS = ['#FF6600', '#2D9CDB', '#4E6377', '#FDC500']
const DEFAULT_BINARY_SERIES_COLOR = '#22C55E'
const TIME_RANGE_SETTINGS: Record<string, { durationHours: number, stepMinutes: number }> = {
  '1H': { durationHours: 1, stepMinutes: 5 },
  '6H': { durationHours: 6, stepMinutes: 15 },
  '1D': { durationHours: 24, stepMinutes: 60 },
  '1W': { durationHours: 24 * 7, stepMinutes: 180 },
  '1M': { durationHours: 24 * 30, stepMinutes: 720 },
  'ALL': { durationHours: 24 * 365, stepMinutes: 1440 },
}

function sortTradesAscending(trades: OutcomeRecentTrade[]) {
  return [...trades].sort(
    (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime(),
  )
}

function getYesOutcome(market: Event['markets'][number]) {
  return market.outcomes.find(outcome => outcome.outcome_index === OUTCOME_INDEX.YES)
    ?? market.outcomes[0]
}

function buildSeriesData(
  sources: SeriesSource[],
  rangeCutoff: number | null,
): { data: ChartDataPoint[], series: { key: string, name: string, color: string }[] } {
  const timeSet = new Set<number>()

  function clampTime(timestamp: number) {
    if (Number.isNaN(timestamp)) {
      return null
    }

    if (rangeCutoff !== null && timestamp < rangeCutoff) {
      return rangeCutoff
    }

    return timestamp
  }

  for (const source of sources) {
    for (const trade of source.trades) {
      const timestamp = clampTime(new Date(trade.executed_at).getTime())
      if (timestamp !== null) {
        timeSet.add(timestamp)
      }
    }

    const fallbackTimestamp = clampTime(source.fallbackTime)
    if (fallbackTimestamp !== null) {
      timeSet.add(fallbackTimestamp)
    }
  }

  if (timeSet.size === 0) {
    const defaultTimestamp = rangeCutoff
      ?? sources[0]?.fallbackTime
      ?? Date.UTC(2020, 0, 1)
    timeSet.add(defaultTimestamp)
    timeSet.add(defaultTimestamp + 60 * 1000)
  }

  const sortedTimes = Array.from(timeSet).sort((a, b) => a - b)
  if (sortedTimes.length === 1) {
    const onlyTime = sortedTimes[0]
    sortedTimes.push(onlyTime + 60 * 1000)
  }

  const lastValues = new Map<string, number>()
  const tradeIndices = new Map<string, number>()

  for (const source of sources) {
    lastValues.set(source.key, source.fallbackValue)
    tradeIndices.set(source.key, 0)
  }

  const data: ChartDataPoint[] = []

  for (const timestamp of sortedTimes) {
    const point: ChartDataPoint = { date: new Date(timestamp) }

    for (const source of sources) {
      const trades = source.trades
      let index = tradeIndices.get(source.key) ?? 0

      while (index < trades.length) {
        const tradeTime = new Date(trades[index].executed_at).getTime()
        if (tradeTime > timestamp) {
          break
        }

        lastValues.set(source.key, trades[index].price * 100)
        index += 1
      }

      tradeIndices.set(source.key, index)
      point[source.key] = lastValues.get(source.key) ?? source.fallbackValue
    }

    data.push(point)
  }

  return {
    data,
    series: sources.map(({ key, name, color }) => ({ key, name, color })),
  }
}

export default function EventChart({ event }: EventChartProps) {
  const yesPrice = useYesPrice()
  const isBinaryMarket = useIsBinaryMarket()

  const [activeTimeRange, setActiveTimeRange] = useState('1D')
  const timeRanges = ['1H', '6H', '1D', '1W', '1M', 'ALL']
  const topMarkets = useMemo(
    () => [...event.markets].sort((a, b) => b.probability - a.probability).slice(0, 4),
    [event.markets],
  )

  const chartConfig = useMemo(() => {
    const range = TIME_RANGE_SETTINGS[activeTimeRange] || TIME_RANGE_SETTINGS['1D']
    const rangeCutoff = activeTimeRange === 'ALL'
      ? null
      : now - range.durationHours * 60 * 60 * 1000

    if (isBinaryMarket) {
      const market = event.markets[0]
      if (!market) {
        return { data: [], series: [] }
      }

      const yesOutcome = getYesOutcome(market)
      const trades = sortTradesAscending(yesOutcome?.recent_trades ?? [])
      const filteredTrades = rangeCutoff
        ? trades.filter(trade => new Date(trade.executed_at).getTime() >= rangeCutoff)
        : trades

      const fallbackPrice = typeof yesOutcome?.last_trade_price === 'number'
        ? yesOutcome.last_trade_price * 100
        : market.probability

      const fallbackTime = yesOutcome?.last_trade_ts
        ? new Date(yesOutcome.last_trade_ts).getTime()
        : market.last_snapshot_at
          ? new Date(market.last_snapshot_at).getTime()
          : new Date(market.updated_at ?? event.updated_at ?? '1970-01-01T00:00:00Z').getTime()

      const seriesSources: SeriesSource[] = [{
        key: `outcome_${yesOutcome?.token_id ?? 'yes'}`,
        name: yesOutcome?.outcome_text ?? 'Yes',
        color: DEFAULT_BINARY_SERIES_COLOR,
        trades: filteredTrades,
        fallbackValue: fallbackPrice,
        fallbackTime,
      }]

      return buildSeriesData(seriesSources, rangeCutoff)
    }

    const seriesSources: SeriesSource[] = topMarkets.map((market, index) => {
      const yesOutcome = getYesOutcome(market)
      const trades = sortTradesAscending(yesOutcome?.recent_trades ?? [])
      const filteredTrades = rangeCutoff
        ? trades.filter(trade => new Date(trade.executed_at).getTime() >= rangeCutoff)
        : trades

      const fallbackPrice = typeof yesOutcome?.last_trade_price === 'number'
        ? yesOutcome.last_trade_price * 100
        : market.probability

      const fallbackTime = yesOutcome?.last_trade_ts
        ? new Date(yesOutcome.last_trade_ts).getTime()
        : market.last_snapshot_at
          ? new Date(market.last_snapshot_at).getTime()
          : new Date(market.updated_at ?? event.updated_at ?? '1970-01-01T00:00:00Z').getTime()

      return {
        key: `market_${market.condition_id}`,
        name: market.short_title || market.title,
        color: POLYMARKET_COLORS[index % POLYMARKET_COLORS.length],
        trades: filteredTrades,
        fallbackValue: fallbackPrice,
        fallbackTime,
      }
    })

    return buildSeriesData(seriesSources, rangeCutoff)
  }, [activeTimeRange, event.markets, event.updated_at, isBinaryMarket, topMarkets])

  const primarySeriesKey = chartConfig.series?.[0]?.key

  const latestChartValue = useMemo(() => {
    if (!primarySeriesKey || chartConfig.data.length === 0) {
      return undefined
    }
    const lastPoint = chartConfig.data[chartConfig.data.length - 1]
    const rawValue = lastPoint[primarySeriesKey]
    return typeof rawValue === 'number' ? rawValue : undefined
  }, [chartConfig.data, primarySeriesKey])

  const priceChange = useMemo(() => {
    if (!primarySeriesKey || chartConfig.data.length < 2) {
      return null
    }

    const firstValue = chartConfig.data[0][primarySeriesKey]
    const lastValue = chartConfig.data[chartConfig.data.length - 1][primarySeriesKey]

    if (typeof firstValue !== 'number' || typeof lastValue !== 'number') {
      return null
    }

    return lastValue - firstValue
  }, [chartConfig.data, primarySeriesKey])

  const formattedChance = Math.round(latestChartValue ?? yesPrice)

  const changeIsPositive = typeof priceChange === 'number' && priceChange > 0
  const changeIsNegative = typeof priceChange === 'number' && priceChange < 0
  const ChangeIcon = changeIsPositive ? TrendingUpIcon : TrendingDownIcon
  const changeColorClass = changeIsPositive
    ? 'text-yes'
    : changeIsNegative
      ? 'text-no'
      : 'text-muted-foreground'

  const legendSeries = isBinaryMarket
    ? chartConfig.series
    : chartConfig.series.length > 0
      ? chartConfig.series
      : topMarkets.map((market, index) => ({
          key: `market_${market.condition_id}`,
          name: market.short_title || market.title,
          color: POLYMARKET_COLORS[index % POLYMARKET_COLORS.length],
        }))

  return (
    <div className="grid gap-4">
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isBinaryMarket
            ? (
                <>
                  <span className="inline-flex items-center gap-1 text-xl font-bold text-primary">
                    {formattedChance}
                    % chance
                  </span>

                  {priceChange !== null && Math.abs(priceChange) >= 0.1 && (
                    <div className={cn('flex items-center gap-1 text-xs font-semibold', changeColorClass)}>
                      <ChangeIcon className="size-4" />
                      <span>
                        {Math.abs(priceChange).toFixed(1)}
                        %
                      </span>
                    </div>
                  )}
                </>
              )
            : (
                <div className="flex flex-wrap items-center gap-4">
                  {legendSeries.map(series => (
                    <div key={series.key} className="flex items-center gap-2">
                      <div
                        className="size-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: series.color,
                        }}
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {series.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-1 text-muted-foreground opacity-50">
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
              data={chartConfig.data}
              series={chartConfig.series}
              width={800}
              height={280}
              margin={{ top: 30, right: 40, bottom: 40, left: 0 }}
            />
          </div>
        </div>
        <ul className="mt-2 flex justify-center gap-4 text-[11px] font-medium">
          {timeRanges.map(range => (
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
