'use client'

import type { ReactElement } from 'react'
import type { DataPoint, PredictionChartCursorSnapshot, PredictionChartProps, SeriesConfig } from '@/types/PredictionChartTypes'
import { AxisBottom, AxisRight } from '@visx/axis'
import { curveLinear } from '@visx/curve'
import { localPoint } from '@visx/event'
import { Group } from '@visx/group'
import { scaleLinear, scaleTime } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { useTooltip } from '@visx/tooltip'
import { bisector } from 'd3-array'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import PredictionChartHeader from '@/components/PredictionChartHeader'
import PredictionChartTooltipOverlay from '@/components/PredictionChartTooltipOverlay'
import {
  arePointsEqual,
  calculateYAxisBounds,
  clamp01,
  DEFAULT_X_AXIS_TICKS,
  INITIAL_REVEAL_DURATION,
  INTERACTION_BASE_REVEAL_DURATION,
  interpolateSeriesPoint,
  runRevealAnimation,
  snapTimestampToInterval,
  stopRevealAnimation,
  TOOLTIP_LABEL_GAP,
  TOOLTIP_LABEL_HEIGHT,
} from '@/lib/prediction-chart'

export type { PredictionChartCursorSnapshot, SeriesConfig }

const bisectDate = bisector<DataPoint, Date>(d => d.date).left

const defaultMargin = { top: 30, right: 60, bottom: 40, left: 0 }
const FUTURE_LINE_COLOR_DARK = '#2C3F4F'
const FUTURE_LINE_COLOR_LIGHT = '#99A6B5'
const FUTURE_LINE_OPACITY_DARK = 0.55
const FUTURE_LINE_OPACITY_LIGHT = 0.35
const GRID_LINE_COLOR_DARK = '#3E5364'
const GRID_LINE_COLOR_LIGHT = '#A7B4C2'
const GRID_LINE_OPACITY_DARK = 0.7
const GRID_LINE_OPACITY_LIGHT = 0.35
const MIDLINE_OPACITY_DARK = 0.8
const MIDLINE_OPACITY_LIGHT = 0.45

export function PredictionChart({
  data: providedData,
  series: providedSeries,
  width = 800,
  height = 400,
  margin = defaultMargin,
  dataSignature,
  onCursorDataChange,
  cursorStepMs,
  xAxisTickCount = DEFAULT_X_AXIS_TICKS,
  legendContent,
  showLegend = true,
  watermark,
}: PredictionChartProps): ReactElement {
  const [data, setData] = useState<DataPoint[]>([])
  const [series, setSeries] = useState<SeriesConfig[]>([])
  const [isClient, setIsClient] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(
    () => typeof document !== 'undefined'
      && document.documentElement.classList.contains('dark'),
  )
  const [revealProgress, setRevealProgress] = useState(0)
  const revealAnimationFrameRef = useRef<number | null>(null)
  const dataSignatureRef = useRef<string | number | null>(null)
  const lastDataUpdateTypeRef = useRef<'reset' | 'append' | 'none'>('reset')
  const hasPointerInteractionRef = useRef(false)
  const lastCursorProgressRef = useRef(0)
  const normalizedSignature = dataSignature ?? '__default__'
  const shouldRenderLegend = showLegend && Boolean(legendContent)
  const shouldRenderWatermark = Boolean(
    watermark && (watermark.iconSvg || watermark.label),
  )
  const emitCursorDataChange = useCallback(
    (point: DataPoint | null) => {
      if (!onCursorDataChange) {
        return
      }

      if (!point) {
        onCursorDataChange(null)
        return
      }

      const values: Record<string, number> = {}

      series.forEach((seriesItem) => {
        const value = point[seriesItem.key]
        if (typeof value === 'number' && Number.isFinite(value)) {
          values[seriesItem.key] = value
        }
      })

      onCursorDataChange({
        date: point.date,
        values,
      })
    },
    [onCursorDataChange, series],
  )

  const {
    tooltipData,
    tooltipLeft,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<DataPoint>()
  const { min: yAxisMin, max: yAxisMax, ticks: yAxisTicks } = useMemo(
    () => calculateYAxisBounds(data, series),
    [data, series],
  )

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
      const domainStart = Math.min(...data.map(d => d.date.getTime()))
      const domainEnd = Math.max(...data.map(d => d.date.getTime()))

      const xScale = scaleTime<number>({
        range: [0, innerWidth],
        domain: [domainStart, domainEnd],
      })

      const yScale = scaleLinear<number>({
        range: [innerHeight, 0],
        domain: [yAxisMin, yAxisMax],
        nice: true,
      })

      const rawDate = xScale.invert(x - margin.left)
      const clampedTime = Math.max(domainStart, Math.min(domainEnd, rawDate.getTime()))
      const targetTime = cursorStepMs && cursorStepMs > 0
        ? snapTimestampToInterval(clampedTime, cursorStepMs, domainStart)
        : clampedTime
      const targetDate = new Date(targetTime)
      const domainSpan = Math.max(1, domainEnd - domainStart)
      lastCursorProgressRef.current = clamp01((targetTime - domainStart) / domainSpan)
      hasPointerInteractionRef.current = true
      stopRevealAnimation(revealAnimationFrameRef)
      const index = bisectDate(data, targetDate, 1)
      const d0 = data[index - 1] ?? null
      const d1 = data[index] ?? null
      const resolvedPoint = interpolateSeriesPoint(targetDate, d0, d1, series)
      const tooltipPoint = resolvedPoint ?? d0 ?? d1 ?? data[0]
      const tooltipLeftPosition = xScale(targetDate)

      showTooltip({
        tooltipData: tooltipPoint,
        tooltipLeft: tooltipLeftPosition,
        tooltipTop: yScale((tooltipPoint[series[0].key] as number) || 0),
      })

      emitCursorDataChange(resolvedPoint ?? tooltipPoint ?? null)
    },
    [
      showTooltip,
      data,
      series,
      width,
      height,
      margin,
      cursorStepMs,
      revealAnimationFrameRef,
      emitCursorDataChange,
      yAxisMin,
      yAxisMax,
    ],
  )

  const dataLength = data.length

  const handleInteractionEnd = useCallback(() => {
    hideTooltip()
    emitCursorDataChange(null)

    if (!dataLength) {
      return
    }

    if (!hasPointerInteractionRef.current) {
      return
    }

    hasPointerInteractionRef.current = false

    const startProgress = clamp01(lastCursorProgressRef.current)
    const distance = Math.abs(1 - startProgress)
    const duration = Math.max(400, distance * INTERACTION_BASE_REVEAL_DURATION)

    runRevealAnimation({
      from: startProgress,
      to: 1,
      duration,
      frameRef: revealAnimationFrameRef,
      setProgress: setRevealProgress,
    })
  }, [hideTooltip, emitCursorDataChange, dataLength, revealAnimationFrameRef])

  useLayoutEffect(() => {
    queueMicrotask(() => {
      setIsClient(true)
    })
  }, [])

  useEffect(() => {
    if (!isClient) {
      return
    }

    if (providedSeries) {
      setSeries(providedSeries)
    }
    else {
      setSeries([])
    }
  }, [providedSeries, isClient])

  useEffect(() => {
    if (!isClient) {
      return
    }

    if (!providedData || providedData.length === 0) {
      dataSignatureRef.current = normalizedSignature
      setData([])
      lastDataUpdateTypeRef.current = 'reset'
      return
    }

    setData((previousData) => {
      const signatureChanged = dataSignatureRef.current !== normalizedSignature
      if (signatureChanged) {
        dataSignatureRef.current = normalizedSignature
        lastDataUpdateTypeRef.current = 'reset'
        return providedData
      }

      if (previousData.length === 0) {
        lastDataUpdateTypeRef.current = 'reset'
        return providedData
      }

      const previousFirst = previousData[0]?.date?.getTime?.()
      const previousLast = previousData[previousData.length - 1]?.date?.getTime?.()
      const incomingFirst = providedData[0]?.date?.getTime?.()
      const incomingLast = providedData[providedData.length - 1]?.date?.getTime?.()

      const timelineValues = [previousFirst, previousLast, incomingFirst, incomingLast]
      const hasInvalidTimeline = timelineValues.some(
        value => typeof value !== 'number' || !Number.isFinite(value),
      )

      if (hasInvalidTimeline) {
        lastDataUpdateTypeRef.current = 'reset'
        return providedData
      }

      if (
        typeof incomingLast === 'number'
        && typeof previousLast === 'number'
        && incomingLast < previousLast
      ) {
        lastDataUpdateTypeRef.current = 'reset'
        return providedData
      }

      if (
        typeof incomingFirst === 'number'
        && typeof previousFirst === 'number'
        && incomingFirst < previousFirst
      ) {
        lastDataUpdateTypeRef.current = 'reset'
        return providedData
      }

      let nextData = previousData
      let didTrim = false

      if (
        typeof incomingFirst === 'number'
        && typeof previousFirst === 'number'
        && incomingFirst > previousFirst
      ) {
        const firstIndexToKeep = previousData.findIndex(point => point.date.getTime() >= incomingFirst)
        if (firstIndexToKeep === -1) {
          nextData = []
          didTrim = previousData.length > 0
        }
        else if (firstIndexToKeep > 0) {
          nextData = previousData.slice(firstIndexToKeep)
          didTrim = true
        }
      }

      const lastTimestamp = nextData.length
        ? nextData[nextData.length - 1].date.getTime()
        : null

      const appendedPoints = providedData.filter((point) => {
        const timestamp = point.date.getTime()
        if (!Number.isFinite(timestamp)) {
          return false
        }

        if (lastTimestamp === null) {
          return true
        }

        return timestamp > lastTimestamp
      })

      if (appendedPoints.length > 0) {
        lastDataUpdateTypeRef.current = 'append'
        return [...nextData, ...appendedPoints]
      }

      if (didTrim) {
        lastDataUpdateTypeRef.current = 'append'
        return nextData
      }

      if (lastTimestamp !== null && nextData.length > 0) {
        const latestPoint = nextData[nextData.length - 1]
        const incomingLatestPoint = providedData[providedData.length - 1]
        if (
          incomingLatestPoint
          && incomingLatestPoint.date.getTime() === lastTimestamp
          && !arePointsEqual(latestPoint, incomingLatestPoint)
        ) {
          lastDataUpdateTypeRef.current = 'append'
          return [...nextData.slice(0, -1), incomingLatestPoint]
        }
      }

      lastDataUpdateTypeRef.current = 'none'
      return previousData
    })
  }, [providedData, normalizedSignature, isClient])

  useEffect(
    () => () => stopRevealAnimation(revealAnimationFrameRef),
    [revealAnimationFrameRef],
  )

  useEffect(() => {
    if (data.length === 0) {
      stopRevealAnimation(revealAnimationFrameRef)
      setRevealProgress(0)
      lastDataUpdateTypeRef.current = 'reset'
      return
    }

    const updateType = lastDataUpdateTypeRef.current

    if (updateType === 'reset') {
      hasPointerInteractionRef.current = false
      lastCursorProgressRef.current = 0
      runRevealAnimation({
        from: 0,
        to: 1,
        duration: INITIAL_REVEAL_DURATION,
        frameRef: revealAnimationFrameRef,
        setProgress: setRevealProgress,
      })
    }
    else {
      stopRevealAnimation(revealAnimationFrameRef)
      setRevealProgress(1)
    }

    lastDataUpdateTypeRef.current = 'none'
  }, [data, revealAnimationFrameRef])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const root = document.documentElement

    function updateTheme() {
      setIsDarkMode(root.classList.contains('dark'))
    }

    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  if (!isClient || data.length === 0 || series.length === 0) {
    return (
      <div className="relative h-full w-full">
        <svg width="100%" height={height}>
          <rect width="100%" height={height} fill="transparent" />
        </svg>
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
    domain: [yAxisMin, yAxisMax],
    nice: true,
  })

  const tooltipActive = Boolean(tooltipOpen && tooltipData && tooltipLeft !== undefined)
  const clampedTooltipX = tooltipActive
    ? Math.max(0, Math.min(tooltipLeft as number, innerWidth))
    : innerWidth
  const cursorDate = tooltipActive
    ? xScale.invert(clampedTooltipX)
    : null
  const insertionIndex = cursorDate ? bisectDate(data, cursorDate) : data.length
  const previousPoint = insertionIndex > 0 ? data[insertionIndex - 1] : null
  const nextPoint = insertionIndex < data.length ? data[insertionIndex] : null

  let cursorPoint: DataPoint | null = null
  if (tooltipActive && cursorDate) {
    cursorPoint = interpolateSeriesPoint(cursorDate, previousPoint, nextPoint, series)
  }

  let coloredPoints: DataPoint[] = data
  let mutedPoints: DataPoint[] = []

  if (tooltipActive) {
    coloredPoints = data.slice(0, insertionIndex)
    mutedPoints = data.slice(insertionIndex)

    if (cursorPoint) {
      const cursorTime = cursorPoint.date.getTime()

      if (
        coloredPoints.length === 0
        || coloredPoints[coloredPoints.length - 1].date.getTime() !== cursorTime
      ) {
        coloredPoints = [...coloredPoints, cursorPoint]
      }
      else {
        coloredPoints = [
          ...coloredPoints.slice(0, coloredPoints.length - 1),
          cursorPoint,
        ]
      }

      if (
        mutedPoints.length === 0
        || mutedPoints[0].date.getTime() !== cursorTime
      ) {
        mutedPoints = [cursorPoint, ...mutedPoints]
      }
      else {
        mutedPoints = [
          cursorPoint,
          ...mutedPoints.slice(1),
        ]
      }
    }
    else if (cursorDate && mutedPoints.length > 0) {
      const firstMutedTime = mutedPoints[0].date.getTime()
      if (cursorDate.getTime() >= firstMutedTime) {
        coloredPoints = [...coloredPoints, mutedPoints[0]]
      }
    }

    if (coloredPoints.length === 0 && data.length > 0) {
      coloredPoints = [data[0]]
    }
  }
  else if (data.length > 0) {
    const totalSegments = Math.max(1, data.length - 1)
    const revealIndex = Math.round(totalSegments * clamp01(revealProgress))
    const clampedIndex = Math.min(revealIndex, data.length - 1)

    coloredPoints = data.slice(0, clampedIndex + 1)
    mutedPoints = data.slice(clampedIndex + 1)

    if (coloredPoints.length === 0) {
      coloredPoints = [data[0]]
    }
  }

  const lastDataPoint = data.length > 0 ? data[data.length - 1] : null
  const isTooltipAtLastPoint = tooltipActive
    && lastDataPoint !== null
    && tooltipData === lastDataPoint
  const showEndpointMarkers = Boolean(lastDataPoint)
    && (!tooltipActive || isTooltipAtLastPoint)
    && mutedPoints.length === 0
  const totalDurationHours = data.length > 1
    ? (data[data.length - 1].date.valueOf() - data[0].date.valueOf()) / 36e5
    : 0

  function formatAxisTick(value: number | { valueOf: () => number }) {
    const numericValue = typeof value === 'number' ? value : value.valueOf()
    const date = new Date(numericValue)

    if (totalDurationHours <= 48) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    }

    if (totalDurationHours <= 24 * 45) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }

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

  const futureLineColor = isDarkMode
    ? FUTURE_LINE_COLOR_DARK
    : FUTURE_LINE_COLOR_LIGHT
  const futureLineOpacity = isDarkMode
    ? FUTURE_LINE_OPACITY_DARK
    : FUTURE_LINE_OPACITY_LIGHT
  const gridLineColor = isDarkMode
    ? GRID_LINE_COLOR_DARK
    : GRID_LINE_COLOR_LIGHT
  const gridLineOpacity = isDarkMode
    ? GRID_LINE_OPACITY_DARK
    : GRID_LINE_OPACITY_LIGHT
  const midlineOpacity = isDarkMode
    ? MIDLINE_OPACITY_DARK
    : MIDLINE_OPACITY_LIGHT

  return (
    <div className="flex w-full flex-col gap-4">
      <PredictionChartHeader
        shouldRenderLegend={shouldRenderLegend}
        legendContent={legendContent}
        shouldRenderWatermark={shouldRenderWatermark}
        watermark={watermark}
      />

      <div className="relative w-full">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          style={{ overflow: 'visible' }}
        >
          <Group left={margin.left} top={margin.top}>
            {yAxisTicks.map(value => (
              <line
                key={`grid-${value}`}
                x1={0}
                x2={innerWidth}
                y1={yScale(value)}
                y2={yScale(value)}
                stroke={gridLineColor}
                strokeWidth={1}
                strokeDasharray="1,3"
                opacity={gridLineOpacity}
              />
            ))}

            {yAxisMax >= 50 && yAxisMin <= 50 && (
              <line
                x1={0}
                x2={innerWidth}
                y1={yScale(50)}
                y2={yScale(50)}
                stroke={gridLineColor}
                strokeWidth={1.5}
                strokeDasharray="2,4"
                opacity={midlineOpacity}
              />
            )}

            {series.map((seriesItem) => {
              const seriesColor = seriesItem.color

              return (
                <g key={seriesItem.key}>
                  {tooltipActive && mutedPoints.length > 1 && (
                    <LinePath<DataPoint>
                      data={mutedPoints}
                      x={d => xScale(getDate(d))}
                      y={d => yScale((d[seriesItem.key] as number) || 0)}
                      stroke={futureLineColor}
                      strokeWidth={1.75}
                      strokeDasharray="1 1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity={futureLineOpacity}
                      curve={curveLinear}
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
                      curve={curveLinear}
                      fill="transparent"
                    />
                  )}
                </g>
              )
            })}

            {showEndpointMarkers
              && lastDataPoint
              && series.map((seriesItem) => {
                const value = (lastDataPoint[seriesItem.key] as number) || 0
                const cx = getX(lastDataPoint)
                const cy = yScale(value)

                return (
                  <g key={`${seriesItem.key}-marker`} transform={`translate(${cx}, ${cy})`}>
                    <circle
                      r={6}
                      fill={seriesItem.color}
                      fillOpacity={0.4}
                      pointerEvents="none"
                      style={{
                        transformOrigin: 'center',
                        transformBox: 'fill-box',
                        animation: 'prediction-chart-radar 2.6s ease-out infinite',
                      }}
                    />
                    <circle
                      r={2.8}
                      fill={seriesItem.color}
                      stroke={seriesItem.color}
                      strokeWidth={1.5}
                      pointerEvents="none"
                    />
                  </g>
                )
              })}

            <AxisRight
              left={innerWidth}
              scale={yScale}
              tickFormat={value => `${value}%`}
              tickValues={yAxisTicks}
              stroke="transparent"
              tickStroke="transparent"
              tickLabelProps={{
                fill: 'var(--muted-foreground)',
                fontSize: 11,
                fontFamily: 'Arial, sans-serif',
                textAnchor: 'start',
                dy: '0.33em',
                dx: '0.5em',
              }}
              tickLength={0}
            />

            <AxisBottom
              top={innerHeight}
              scale={xScale}
              tickFormat={formatAxisTick}
              stroke="transparent"
              tickStroke="transparent"
              tickLabelProps={{
                fill: 'var(--muted-foreground)',
                fontSize: 11,
                fontFamily: 'Arial, sans-serif',
                textAnchor: 'middle',
                dy: '0.6em',
              }}
              numTicks={xAxisTickCount}
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
              onMouseLeave={handleInteractionEnd}
              onTouchEnd={handleInteractionEnd}
              onTouchCancel={handleInteractionEnd}
            />

            {tooltipActive && (
              <line
                x1={clampedTooltipX}
                x2={clampedTooltipX}
                y1={-32}
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

        <PredictionChartTooltipOverlay
          tooltipActive={tooltipActive}
          tooltipData={tooltipData ?? null}
          positionedTooltipEntries={positionedTooltipEntries}
          margin={margin}
          innerWidth={innerWidth}
          clampedTooltipX={clampedTooltipX}
        />
      </div>
    </div>
  )
}

export default PredictionChart
