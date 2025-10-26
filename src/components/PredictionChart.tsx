'use client'

import { AxisBottom, AxisRight } from '@visx/axis'
import { curveMonotoneX } from '@visx/curve'
import { localPoint } from '@visx/event'
import { Group } from '@visx/group'
import { scaleLinear, scaleTime } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { useTooltip } from '@visx/tooltip'
import { bisector } from 'd3-array'
import { useCallback, useLayoutEffect, useState } from 'react'

// Data types
interface DataPoint {
  date: Date
  [key: string]: number | Date
}

interface SeriesConfig {
  key: string
  name: string
  color: string
}

interface PredictionChartProps {
  data?: DataPoint[]
  series?: SeriesConfig[]
  width?: number
  height?: number
  margin?: { top: number, right: number, bottom: number, left: number }
}

const bisectDate = bisector<DataPoint, Date>(d => d.date).left

// Example usage with multiple custom series:
// const customData = [
//   { date: new Date(), option1: 40, option2: 35, option3: 25 }
// ];
// const customSeries = [
//   { key: "option1", name: "Option 1", color: "#10b981" },
//   { key: "option2", name: "Option 2", color: "#ef4444" },
//   { key: "option3", name: "Option 3", color: "#f59e0b" }
// ];
// <PredictionChart data={customData} series={customSeries} />

const defaultMargin = { top: 30, right: 60, bottom: 40, left: 0 }
const TOOLTIP_LABEL_HEIGHT = 20
const TOOLTIP_LABEL_GAP = 6
const TOOLTIP_LABEL_MAX_WIDTH = 160
const TOOLTIP_LABEL_ANCHOR_OFFSET = 10
const FUTURE_LINE_COLOR = '#2C3F4F'
const FUTURE_LINE_OPACITY = 0.55

export function PredictionChart({
  data: providedData,
  series: providedSeries,
  width = 800,
  height = 400,
  margin = defaultMargin,
}: PredictionChartProps): React.ReactElement {
  const [data, setData] = useState<DataPoint[]>([])
  const [series, setSeries] = useState<SeriesConfig[]>([])
  const [isClient, setIsClient] = useState(false)

  const {
    tooltipData,
    tooltipLeft,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<DataPoint>()

  const handleTooltip = useCallback(
    (
      event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>,
    ) => {
      if (!data.length || !series.length) {
        return
      }

      const { x } = localPoint(event) || { x: 0 }
      const innerWidth = width - margin.left - margin.right
      const innerHeight = height - margin.top - margin.bottom

      const xScale = scaleTime<number>({
        range: [0, innerWidth],
        domain: [
          Math.min(...data.map(d => d.date.getTime())),
          Math.max(...data.map(d => d.date.getTime())),
        ],
      })

      const yScale = scaleLinear<number>({
        range: [innerHeight, 0],
        domain: [0, 100],
        nice: true,
      })

      const x0 = xScale.invert(x - margin.left)
      const index = bisectDate(data, x0, 1)
      const d0 = data[index - 1]
      const d1 = data[index]
      let d = d0
      if (d1 && d1.date) {
        d
          = x0.valueOf() - d0.date.valueOf() > d1.date.valueOf() - x0.valueOf()
            ? d1
            : d0
      }
      showTooltip({
        tooltipData: d,
        tooltipLeft: x - margin.left,
        tooltipTop: yScale((d[series[0].key] as number) || 0),
      })
    },
    [showTooltip, data, series, width, height, margin],
  )

  useLayoutEffect(() => {
    queueMicrotask(() => {
      setIsClient(true)

      if (providedData && providedSeries) {
        setData(providedData)
        setSeries(providedSeries)
      }
    })
  }, [providedData, providedSeries])

  if (!isClient || data.length === 0 || series.length === 0) {
    return (
      <div className="relative h-full w-full">
        <svg width="100%" height={height}>
          <rect width="100%" height={height} fill="transparent" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-muted-foreground">Loading chart...</span>
        </div>
      </div>
    )
  }

  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const xScale = scaleTime<number>({
    range: [0, innerWidth],
    domain: [
      Math.min(...data.map(d => d.date.getTime())),
      Math.max(...data.map(d => d.date.getTime())),
    ],
  })

  const yScale = scaleLinear<number>({
    range: [innerHeight, 0],
    domain: [0, 100],
    nice: true,
  })

  const tooltipActive
    = tooltipOpen && tooltipData && tooltipLeft !== undefined
  const clampedTooltipX = tooltipActive
    ? Math.max(0, Math.min(tooltipLeft as number, innerWidth))
    : 0
  const cursorDate = tooltipActive
    ? xScale.invert(clampedTooltipX)
    : null
  const cursorSplitIndex = cursorDate
    ? Math.min(
        data.length,
        Math.max(1, bisectDate(data, cursorDate, 1)),
      )
    : data.length

  interface TooltipEntry {
    key: string
    name: string
    color: string
    value: number
    initialTop: number
  }
  type PositionedTooltipEntry = TooltipEntry & { top: number }

  const tooltipEntries: TooltipEntry[] = tooltipActive && tooltipData
    ? series
        .map((seriesItem) => {
          const value = tooltipData[seriesItem.key]
          if (typeof value !== 'number') {
            return null
          }

          return {
            key: seriesItem.key,
            name: seriesItem.name,
            color: seriesItem.color,
            value,
            initialTop: margin.top
              + yScale(value)
              - TOOLTIP_LABEL_HEIGHT / 2,
          }
        })
        .filter((entry): entry is TooltipEntry => entry !== null)
    : []

  let positionedTooltipEntries: PositionedTooltipEntry[] = []
  if (tooltipEntries.length > 0) {
    const sorted = [...tooltipEntries].sort(
      (a, b) => a.initialTop - b.initialTop,
    )

    const minTop = margin.top
    const rawMaxTop = margin.top + innerHeight - TOOLTIP_LABEL_HEIGHT
    const maxTop = rawMaxTop < minTop ? minTop : rawMaxTop
    const step = TOOLTIP_LABEL_HEIGHT + TOOLTIP_LABEL_GAP

    const positioned: PositionedTooltipEntry[] = []
    sorted.forEach((entry, index) => {
      const clampedDesired = Math.max(
        minTop,
        Math.min(entry.initialTop, maxTop),
      )
      const previousTop = index > 0 ? positioned[index - 1].top : null
      const top = previousTop === null
        ? clampedDesired
        : Math.max(clampedDesired, previousTop + step)

      positioned.push({
        ...entry,
        top,
      })
    })

    if (positioned.length > 0) {
      const lastIndex = positioned.length - 1
      const overflow = positioned[lastIndex].top - maxTop
      if (overflow > 0) {
        for (let i = 0; i < positioned.length; i += 1) {
          positioned[i].top -= overflow
        }
      }

      const underflow = minTop - positioned[0].top
      if (underflow > 0) {
        for (let i = 0; i < positioned.length; i += 1) {
          positioned[i].top += underflow
        }
      }
    }

    positionedTooltipEntries = positioned
  }

  function getDate(d: DataPoint) {
    return d.date
  }

  function getX(d: DataPoint) {
    return xScale(getDate(d))
  }

  return (
    <div className="relative h-full w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <Group left={margin.left} top={margin.top}>
          {[0, 20, 40, 60, 80, 100].map(value => (
            <line
              key={`grid-${value}`}
              x1={0}
              x2={innerWidth}
              y1={yScale(value)}
              y2={yScale(value)}
              stroke="#344452"
              strokeWidth={1}
              strokeDasharray="1,3"
              opacity={0.6}
            />
          ))}

          <line
            x1={0}
            x2={innerWidth}
            y1={yScale(50)}
            y2={yScale(50)}
            stroke="#344452"
            strokeWidth={1.5}
            strokeDasharray="2,4"
            opacity={0.8}
          />

          {series.map((seriesItem) => {
            const seriesColor = seriesItem.color

            let coloredPoints: DataPoint[] = data
            let mutedPoints: DataPoint[] = []

            if (tooltipActive && cursorSplitIndex > 0) {
              coloredPoints = data.slice(0, cursorSplitIndex)
              mutedPoints = cursorSplitIndex < data.length
                ? data.slice(cursorSplitIndex - 1)
                : []
            }

            return (
              <g key={seriesItem.key}>
                {mutedPoints.length > 1 && (
                  <LinePath<DataPoint>
                    data={mutedPoints}
                    x={d => xScale(getDate(d))}
                    y={d => yScale((d[seriesItem.key] as number) || 0)}
                    stroke={FUTURE_LINE_COLOR}
                    strokeWidth={1.75}
                    strokeDasharray="1 1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={FUTURE_LINE_OPACITY}
                    curve={curveMonotoneX}
                    fill="transparent"
                  />
                )}

                {coloredPoints.length > 1 && (
                  <LinePath<DataPoint>
                    data={coloredPoints}
                    x={d => xScale(getDate(d))}
                    y={d => yScale((d[seriesItem.key] as number) || 0)}
                    stroke={seriesColor}
                    strokeWidth={1.75}
                    strokeOpacity={1}
                    strokeDasharray="1 1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    curve={curveMonotoneX}
                    fill="transparent"
                  />
                )}
              </g>
            )
          })}

          {/* Marcadores nas pontas das séries */}
          {data.length > 0
            && series.map((seriesItem) => {
              const lastPoint = data[data.length - 1]
              const value = (lastPoint[seriesItem.key] as number) || 0
              const cx = getX(lastPoint)
              const cy = yScale(value)

              return (
                <g key={`${seriesItem.key}-marker`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={7}
                    fill="transparent"
                    stroke={seriesItem.color}
                    strokeOpacity={0.18}
                    strokeWidth={2}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={seriesItem.color}
                    stroke={seriesItem.color}
                    strokeWidth={1.5}
                  />
                </g>
              )
            })}

          <AxisRight
            left={innerWidth}
            scale={yScale}
            tickFormat={value => `${value}%`}
            stroke="transparent"
            tickStroke="transparent"
            tickLabelProps={{
              fill: '#858D92',
              fontSize: 11,
              fontFamily: 'Arial, sans-serif',
              textAnchor: 'start',
              dy: '0.33em',
              dx: '0.5em',
            }}
            numTicks={6}
            tickLength={0}
          />

          <AxisBottom
            top={innerHeight}
            scale={xScale}
            tickFormat={(value) => {
              const date = new Date(Number(value))
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            }}
            stroke="transparent"
            tickStroke="transparent"
            tickLabelProps={{
              fill: '#858D92',
              fontSize: 11,
              fontFamily: 'Arial, sans-serif',
              textAnchor: 'middle',
              dy: '0.25em',
            }}
            numTicks={6}
            tickLength={0}
          />

          <rect
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={() => hideTooltip()}
          />

          {tooltipActive && (
            <line
              x1={clampedTooltipX}
              x2={clampedTooltipX}
              y1={-16}
              y2={innerHeight}
              stroke="#2C3F4F"
              strokeWidth={1.5}
              opacity={0.9}
              pointerEvents="none"
            />
          )}

          {tooltipActive
            && positionedTooltipEntries.map(entry => (
              <circle
                key={`${entry.key}-tooltip-circle`}
                cx={clampedTooltipX}
                cy={yScale(entry.value)}
                r={4}
                fill={entry.color}
                stroke={entry.color}
                strokeOpacity={0.1}
                strokeWidth={2}
                pointerEvents="none"
              />
            ))}
        </Group>
      </svg>

      {tooltipActive && positionedTooltipEntries.length > 0 && tooltipData && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div
            className="absolute text-[12px] font-medium text-[#858D92]"
            style={{
              top: Math.max(margin.top - 28, 0),
              left: margin.left + clampedTooltipX - 12,
              transform: 'translateX(-100%)',
              whiteSpace: 'nowrap',
            }}
          >
            {tooltipData.date.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>

          {(() => {
            const labelRightBoundary = margin.left + innerWidth - 4
            const labelLeftBoundary = Math.min(
              labelRightBoundary,
              margin.left + TOOLTIP_LABEL_MAX_WIDTH,
            )
            const baseLabelAnchor = margin.left
              + clampedTooltipX
              - TOOLTIP_LABEL_ANCHOR_OFFSET
            const resolvedLeft = Math.min(
              labelRightBoundary,
              Math.max(labelLeftBoundary, baseLabelAnchor),
            )

            return positionedTooltipEntries.map(entry => (
              <div
                key={`${entry.key}-label`}
                className={`
                  absolute flex h-5 min-w-[112px] items-center justify-between gap-2 rounded px-2 text-[11px] leading-5
                  font-semibold text-white
                `}
                style={{
                  top: entry.top,
                  left: resolvedLeft,
                  maxWidth: `${TOOLTIP_LABEL_MAX_WIDTH}px`,
                  transform: 'translateX(-100%)',
                  backgroundColor: entry.color,
                }}
              >
                <span className="max-w-[140px] truncate capitalize">
                  {entry.name}
                </span>
                <span>
                  {entry.value.toFixed(1)}
                  %
                </span>
              </div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}

export default PredictionChart
