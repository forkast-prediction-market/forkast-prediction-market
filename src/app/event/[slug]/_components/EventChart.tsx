import type { Event } from '@/types'
import { TrendingDownIcon } from 'lucide-react'
import { useState } from 'react'
import PredictionChart from '@/components/charts/PredictionChart'
import { cn, sanitizeSvg } from '@/lib/utils'
import { useIsBinaryMarket, useYesPrice } from '@/stores/useOrder'

interface Props {
  event: Event
}

export default function EventChart({ event }: Props) {
  const yesPrice = useYesPrice()
  const isBinaryMarket = useIsBinaryMarket()

  const [activeTimeRange, setActiveTimeRange] = useState('1D')
  const timeRanges = ['1H', '6H', '1D', '1W', '1M', 'ALL']
  const POLYMARKET_COLORS = ['#2D9CDB', '#FF5952', '#27AE60', '#9B51E0']

  function generateChartData() {
    const topMarkets = getTopMarkets()
    const now = new Date()
    const data = []

    const series = topMarkets.map((market, index) => ({
      key: `market_${market.condition_id}`,
      name: market.short_title || market.title,
      color: POLYMARKET_COLORS[index] || '#8B5CF6',
    }))

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      const dataPoint: { date: Date, [key: string]: number | Date } = { date }

      topMarkets.forEach((market) => {
        const key = `market_${market.condition_id}`
        const baseProbability = market.probability
        const timeVariation = Math.sin((29 - i) * 0.1) * 5
        const randomVariation = (Math.random() - 0.5) * 8
        const variation = timeVariation + randomVariation

        let value = baseProbability + variation
        value = Math.max(5, Math.min(85, value)) // Limit between 5% and 85%

        dataPoint[key] = value
      })

      // Normalize so the sum is close to 100%
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

  // Generate dynamic data for the chart
  const chartConfig = generateChartData()

  function getTopMarkets() {
    return [...event.markets].sort((a, b) => b.total_volume - a.total_volume).slice(0, 4)
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
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
                  {getTopMarkets().map((market, index) => (
                    <div key={market.condition_id} className="flex items-center gap-2">
                      <div
                        className="size-3 rounded-full"
                        style={{
                          backgroundColor: POLYMARKET_COLORS[index % 4],
                        }}
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {market.short_title || market.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
        </div>

        <div className="flex items-center gap-1 text-muted-foreground opacity-40">
          <div
            className="size-6"
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
