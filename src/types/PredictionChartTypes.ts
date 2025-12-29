import type { ReactNode } from 'react'

export interface DataPoint {
  date: Date
  [key: string]: number | Date
}

export interface SeriesConfig {
  key: string
  name: string
  color: string
}

export interface PredictionChartCursorSnapshot {
  date: Date
  values: Record<string, number>
}

export interface PredictionChartProps {
  data?: DataPoint[]
  series?: SeriesConfig[]
  width?: number
  height?: number
  margin?: { top: number, right: number, bottom: number, left: number }
  dataSignature?: string | number
  onCursorDataChange?: (snapshot: PredictionChartCursorSnapshot | null) => void
  cursorStepMs?: number
  xAxisTickCount?: number
  legendContent?: ReactNode
  showLegend?: boolean
  watermark?: {
    iconSvg?: string | null
    label?: string | null
  }
}
