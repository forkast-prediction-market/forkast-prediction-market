'use client'

import type { Event } from '@/types'
import { TrendingDownIcon } from 'lucide-react'
import { useState } from 'react'
import PredictionChart from '@/components/charts/PredictionChart'
import { sanitizeSvg } from '@/lib/utils'

interface Props {
  event: Event
  tradingState: ReturnType<typeof import('@/hooks/useTradingState').useTradingState>
}

export default function EventChart({ event, tradingState }: Props) {
  const [activeTimeRange, setActiveTimeRange] = useState('1D')
  const timeRanges = ['1H', '6H', '1D', '1W', '1M', 'ALL']
  const POLYMARKET_COLORS = ['#2D9CDB', '#FF5952', '#27AE60', '#9B51E0']

  // Function to generate chart data based on actual outcomes
  function generateChartData() {
    const topOutcomes = getTopOutcomesForChart()
    const now = new Date()
    const data = []

    // Generate series configuration based on actual outcomes
    const series = topOutcomes.map((outcome, index) => ({
      key: `outcome_${outcome.id}`,
      name: outcome.name,
      color: POLYMARKET_COLORS[index] || '#8B5CF6',
    }))

    // Generate simulated historical data for the last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      const dataPoint: { date: Date, [key: string]: number | Date } = { date }

      // For each outcome, generate a trend based on current probability
      topOutcomes.forEach((outcome) => {
        const key = `outcome_${outcome.id}`
        const baseProbability = outcome.probability

        // Add temporal and random variation
        const timeVariation = Math.sin((29 - i) * 0.1) * 5
        const randomVariation = (Math.random() - 0.5) * 8
        const variation = timeVariation + randomVariation

        let value = baseProbability + variation
        value = Math.max(5, Math.min(85, value)) // Limit between 5% and 85%

        dataPoint[key] = value
      })

      // Normalize so the sum is close to 100%
      const total = topOutcomes.reduce(
        (sum, outcome) => sum + (dataPoint[`outcome_${outcome.id}`] as number),
        0,
      )

      if (total > 0) {
        topOutcomes.forEach((outcome) => {
          const key = `outcome_${outcome.id}`
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

  function getTopOutcomesForChart() {
    return [...event.outcomes].sort((a, b) => b.volume - a.volume).slice(0, 4)
  }

  return (
    <>
      {/* Probability tag or legend */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {event.active_markets_count === 1
              ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-xl font-bold text-primary">
                      {Math.round(tradingState.primaryProbability)}
                      % chance
                    </span>

                    {/* Red arrow with percentage */}
                    <div className="flex items-center gap-1 text-no">
                      <TrendingDownIcon className="h-4 w-4" />
                      <span className="text-xs font-semibold">
                        94
                        %
                      </span>
                    </div>
                  </>
                )
              : (
                  <div className="flex flex-wrap items-center gap-4">
                    {getTopOutcomesForChart().map((outcome, index) => (
                      <div key={outcome.id} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: POLYMARKET_COLORS[index % 4],
                          }}
                        />
                        <span className="text-sm font-medium text-muted-foreground">
                          {outcome.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
          </div>

          {/* Logo for prints - always present */}
          <div className="flex items-center gap-1 text-muted-foreground opacity-40">
            <div
              className="h-6 w-6"
              dangerouslySetInnerHTML={{
                __html: sanitizeSvg(process.env.NEXT_PUBLIC_SITE_LOGO_SVG!),
              }}
            />
            <span className="text-xl font-medium">
              {process.env.NEXT_PUBLIC_SITE_NAME}
            </span>
          </div>
        </div>
      </div>

      {/* Price chart */}
      <div className="mt-4">
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
              className={`cursor-pointer transition-colors duration-200 ${
                activeTimeRange === range
                  ? 'border-b-2 border-foreground text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTimeRange(range)}
            >
              {range}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
