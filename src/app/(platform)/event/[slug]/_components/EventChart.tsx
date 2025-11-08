import type { PredictionChartCursorSnapshot } from '@/components/PredictionChart'
import type { Event } from '@/types'
import { TrendingDownIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import PredictionChart from '@/components/PredictionChart'
import { cn, sanitizeSvg } from '@/lib/utils'
import { useIsBinaryMarket, useYesPrice } from '@/stores/useOrder'

interface EventChartProps {
  event: Event
  isMobile: boolean
}

const POLYMARKET_COLORS = ['#FF6600', '#2D9CDB', '#4E6377', '#FDC500']
const TIME_RANGE_SETTINGS: Record<string, { durationHours: number, stepMinutes: number }> = {
  '1H': { durationHours: 1, stepMinutes: 5 },
  '6H': { durationHours: 6, stepMinutes: 15 },
  '1D': { durationHours: 24, stepMinutes: 60 },
  '1W': { durationHours: 24 * 7, stepMinutes: 180 },
  '1M': { durationHours: 24 * 30, stepMinutes: 720 },
  'ALL': { durationHours: 24 * 90, stepMinutes: 1440 },
}

function selectTopMarkets(markets: Event['markets']) {
  return [...markets].sort((a, b) => b.total_volume - a.total_volume).slice(0, 4)
}

function getTimeRangeConfig(range: string) {
  return TIME_RANGE_SETTINGS[range] || TIME_RANGE_SETTINGS.ALL
}

function generateChartData(topMarkets: Event['markets'], range: string) {
  const now = new Date()
  const data = []
  const { durationHours, stepMinutes } = getTimeRangeConfig(range)
  const stepMilliseconds = stepMinutes * 60 * 1000
  const totalSteps = Math.max(1, Math.round((durationHours * 60) / stepMinutes))

  const series = topMarkets.map((market, index) => ({
    key: `market_${market.condition_id}`,
    name: market.short_title || market.title,
    color: POLYMARKET_COLORS[index % POLYMARKET_COLORS.length],
  }))

  for (let i = totalSteps; i >= 0; i -= 1) {
    const date = new Date(now.getTime() - i * stepMilliseconds)
    const minutes = date.getMinutes()
    const remainder = stepMinutes > 0 ? minutes % stepMinutes : 0
    date.setMinutes(minutes - remainder, 0, 0)

    const dataPoint: { date: Date, [key: string]: number | Date } = { date }
    const elapsedSteps = totalSteps - i
    const progress = totalSteps === 0 ? 0 : elapsedSteps / totalSteps

    topMarkets.forEach((market, marketIndex) => {
      const key = `market_${market.condition_id}`
      const baseProbability = market.probability
      const timeVariation = Math.sin(progress * Math.PI * 2) * 4
      const randomVariation = Math.sin((elapsedSteps + 1) * (marketIndex + 1) * 0.95) * 3
      const variation = timeVariation + randomVariation

      let value = baseProbability + variation
      value = Math.max(5, Math.min(85, value))

      dataPoint[key] = value
    })

    const total = topMarkets.reduce(
      (sum, market) => sum + (dataPoint[`market_${market.condition_id}`] as number),
      0,
    )

    if (total > 0) {
      topMarkets.forEach((market) => {
        const key = `market_${market.condition_id}`
        const currentValue = dataPoint[key] as number
        dataPoint[key] = (currentValue / total) * 100
      })
    }

    data.push(dataPoint)
  }

  return { data, series }
}

export default function EventChart({ event, isMobile }: EventChartProps) {
  const yesPrice = useYesPrice()
  const isBinaryMarket = useIsBinaryMarket()

  const [activeTimeRange, setActiveTimeRange] = useState('ALL')
  const [cursorSnapshot, setCursorSnapshot] = useState<PredictionChartCursorSnapshot | null>(null)
  const timeRanges = ['1H', '6H', '1D', '1W', '1M', 'ALL']

  useEffect(() => {
    setCursorSnapshot(null)
  }, [activeTimeRange, event.slug])

  const topMarkets = useMemo(
    () => selectTopMarkets(event.markets),
    [event.markets],
  )

  const chartConfig = useMemo(
    () => generateChartData(topMarkets, activeTimeRange),
    [topMarkets, activeTimeRange],
  )

  const legendEntries = useMemo(() => {
    if (!chartConfig.series.length) {
      return []
    }

    const fallbackPoint = chartConfig.data.length
      ? chartConfig.data[chartConfig.data.length - 1]
      : null

    const baseValues: Record<string, number> = {}

    if (fallbackPoint) {
      chartConfig.series.forEach((seriesItem) => {
        const value = fallbackPoint[seriesItem.key]
        if (typeof value === 'number' && Number.isFinite(value)) {
          baseValues[seriesItem.key] = value
        }
      })
    }

    if (cursorSnapshot) {
      Object.assign(baseValues, cursorSnapshot.values)
    }

    return chartConfig.series
      .map(seriesItem => ({
        key: seriesItem.key,
        name: seriesItem.name,
        color: seriesItem.color,
        value: baseValues[seriesItem.key] ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [chartConfig, cursorSnapshot])

  const chartWidth = isMobile ? 400 : 900

  return (
    <div className="grid gap-4">
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isBinaryMarket
            ? (
                <>
                  <span className="inline-flex items-center gap-1 text-xl font-bold text-primary">
                    {Math.round(yesPrice)}
                    % chance
                  </span>

                  <div className="flex items-center gap-1 text-no">
                    <TrendingDownIcon className="size-4" />
                    <span className="text-xs font-semibold">
                      94
                      %
                    </span>
                  </div>
                </>
              )
            : (
                <div className="flex flex-wrap items-center gap-4">
                  {legendEntries.map(entry => (
                    <div key={entry.key} className="flex items-center gap-2">
                      <div
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {entry.name}
                        {' '}
                        <span className="font-semibold text-muted-foreground">
                          {entry.value.toFixed(1)}
                          %
                        </span>
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
              width={chartWidth}
              height={280}
              margin={{ top: 30, right: 40, bottom: 52, left: 0 }}
              onCursorDataChange={setCursorSnapshot}
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
