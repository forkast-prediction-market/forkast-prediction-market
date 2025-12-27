'use client'

import { MinusIcon, TriangleIcon } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { sanitizeSvg } from '@/lib/utils'

interface TimeframePillsProps {
  activeTimeframe: string
  onTimeframeChange: (timeframe: string) => void
}

function TimeframePills({ activeTimeframe, onTimeframeChange }: TimeframePillsProps) {
  const timeframes = ['1D', '1W', '1M', 'ALL']

  return (
    <div className="flex gap-1">
      {timeframes.map(timeframe => (
        <button
          type="button"
          key={timeframe}
          onClick={() => onTimeframeChange(timeframe)}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            activeTimeframe === timeframe
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {timeframe}
        </button>
      ))}
    </div>
  )
}

export default function PortfolioProfitLossCard() {
  const [activeTimeframe, setActiveTimeframe] = useState('ALL')
  const profitLoss = -0.89
  const isPositive = profitLoss > 0
  const isNegative = profitLoss < 0

  function getStatusIcon() {
    if (isPositive) {
      return <TriangleIcon className="size-4 fill-yes text-yes" />
    }
    else if (isNegative) {
      return <TriangleIcon className="size-4 rotate-180 fill-no text-no" />
    }
    else {
      return <MinusIcon className="size-4 text-muted-foreground" />
    }
  }

  return (
    <Card className="border border-border/60 bg-transparent">
      <CardContent className="flex flex-col p-6">

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium text-muted-foreground uppercase">Profit/Loss</span>
          </div>
          <TimeframePills
            activeTimeframe={activeTimeframe}
            onTimeframeChange={setActiveTimeframe}
          />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <div className={`text-3xl font-bold ${isPositive ? 'text-yes' : 'text-no'}`}>
            {isPositive ? '+' : isNegative ? '-' : ''}
            $
            {Math.abs(profitLoss).toFixed(2)}
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

        <div className="mb-3">
          <span className="text-sm text-muted-foreground">All-Time</span>
        </div>

        <div className="relative h-5">
          <svg
            width="100"
            height="20"
            viewBox="0 0 100 20"
            className="h-full w-full"
          >
            <defs>
              <linearGradient id="miniChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(239 68 68)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="rgb(239 68 68)" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <path
              d="M0,8 Q25,6 50,10 T100,14 L100,20 L0,20 Z"
              fill="url(#miniChartGradient)"
            />
            <path
              d="M0,8 Q25,6 50,10 T100,14"
              fill="none"
              stroke="rgb(239 68 68)"
              strokeWidth="1"
              opacity={0.7}
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}
