'use client'

import type { ReactNode } from 'react'

interface EventChartLayoutProps {
  header?: ReactNode
  chart: ReactNode
  controls?: ReactNode
}

export default function EventChartLayout({ header, chart, controls }: EventChartLayoutProps) {
  return (
    <div className="grid gap-4">
      {header ?? null}
      <div>
        {chart}
        {controls ?? null}
      </div>
    </div>
  )
}
