import type { DataPoint } from '@/types/PredictionChartTypes'
import { TOOLTIP_LABEL_MAX_WIDTH } from '@/lib/prediction-chart'

interface TooltipEntry {
  key: string
  name: string
  color: string
  value: number
  top: number
}

interface PredictionChartTooltipOverlayProps {
  tooltipActive: boolean
  tooltipData: DataPoint | null
  positionedTooltipEntries: TooltipEntry[]
  margin: { top: number, right: number, bottom: number, left: number }
  innerWidth: number
  clampedTooltipX: number
}

export default function PredictionChartTooltipOverlay({
  tooltipActive,
  tooltipData,
  positionedTooltipEntries,
  margin,
  innerWidth,
  clampedTooltipX,
}: PredictionChartTooltipOverlayProps) {
  if (!tooltipActive || !tooltipData || positionedTooltipEntries.length === 0) {
    return null
  }

  const dateLabel = tooltipData.date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const dateLabelStyle = (() => {
    const dateLabelMaxWidth = 180
    const pointerX = margin.left + clampedTooltipX
    const offset = 6
    const chartLeft = margin.left + 4
    const chartRight = margin.left + innerWidth - 4
    const preferRight = pointerX + offset + dateLabelMaxWidth <= chartRight
    const anchorRightSide = preferRight
      ? pointerX + offset
      : pointerX - offset

    if (preferRight) {
      return {
        left: Math.min(
          Math.max(anchorRightSide, chartLeft),
          chartRight - dateLabelMaxWidth,
        ),
        transform: 'translateX(0)',
      }
    }

    const minLeftForLeftAnchor = chartLeft + dateLabelMaxWidth
    return {
      left: Math.min(
        Math.max(anchorRightSide, minLeftForLeftAnchor),
        chartRight,
      ),
      transform: 'translateX(-100%)',
    }
  })()

  const tooltipLabelPosition = (() => {
    const pointerX = margin.left + clampedTooltipX
    const chartLeft = margin.left + 4
    const chartRight = margin.left + innerWidth - 4
    const anchorOffset = 6
    const anchorBoundaryWidth = 180
    const labelMaxWidth = TOOLTIP_LABEL_MAX_WIDTH

    const preferRight = pointerX + anchorOffset + anchorBoundaryWidth <= chartRight
    const anchor = preferRight
      ? pointerX + anchorOffset
      : pointerX - anchorOffset

    const resolvedLeft = preferRight
      ? Math.min(
          Math.max(anchor, chartLeft),
          chartRight - labelMaxWidth,
        )
      : Math.min(
          Math.max(anchor, chartLeft + labelMaxWidth),
          chartRight,
        )

    return {
      left: resolvedLeft,
      transform: preferRight ? 'translateX(0)' : 'translateX(-100%)',
    }
  })()

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div
        className="absolute text-xs font-medium text-muted-foreground"
        style={{
          top: Math.max(0, margin.top - 36),
          left: dateLabelStyle.left,
          maxWidth: '180px',
          whiteSpace: 'nowrap',
          transform: dateLabelStyle.transform,
        }}
      >
        {dateLabel}
      </div>

      {positionedTooltipEntries.map(entry => (
        <div
          key={`${entry.key}-label`}
          className={
            `
              absolute inline-flex h-5 w-fit items-center gap-1 rounded px-1.5 py-0.5 text-2xs leading-5 font-semibold
              text-white
            `
          }
          style={{
            top: entry.top,
            left: tooltipLabelPosition.left,
            maxWidth: `${TOOLTIP_LABEL_MAX_WIDTH}px`,
            transform: tooltipLabelPosition.transform,
            backgroundColor: entry.color,
          }}
        >
          <span className="max-w-30 truncate capitalize">
            {entry.name}
          </span>
          <span className="tabular-nums">
            {entry.value.toFixed(1)}
            %
          </span>
        </div>
      ))}
    </div>
  )
}
