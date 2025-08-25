'use client'

import { AxisBottom, AxisRight } from '@visx/axis'
import { curveMonotoneX } from '@visx/curve'
import { localPoint } from '@visx/event'
import { Group } from '@visx/group'
import { scaleLinear, scaleTime } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { defaultStyles, TooltipWithBounds, useTooltip } from '@visx/tooltip'
import { bisector } from 'd3-array'
import React, { useCallback, useLayoutEffect, useState } from 'react'

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

const tooltipStyles = {
  ...defaultStyles,
  backgroundColor: 'hsl(var(--card))',
  color: 'hsl(var(--card-foreground))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  padding: '12px 16px',
  fontSize: '12px',
  fontWeight: '500',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
  backdropFilter: 'blur(8px)',
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
    tooltipTop,
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
    setIsClient(true)

    if (providedData && providedSeries) {
      setData(providedData)
      setSeries(providedSeries)
    }
    else {
      function generateMultiSeriesData() {
        const now = new Date()
        const generatedData: DataPoint[] = []

        // Configure series with the 4 items with most volume
        const defaultSeries: SeriesConfig[] = [
          { key: 'yes', name: 'Elon Musk 2028', color: '#2D9CDB' }, // Polymarket Blue
          { key: 'no', name: 'Bitcoin $150K', color: '#FF5952' }, // Polymarket Red
          { key: 'maybe', name: 'GPT-5 Release', color: '#27AE60' }, // Polymarket Green
          { key: 'unlikely', name: 'Taylor Grammy', color: '#9B51E0' }, // Polymarket Purple
        ]

        for (let i = 29; i >= 0; i--) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)

          // For Yes: increasing trend
          const yesBase = 25 + (29 - i) * 1.2
          const yesVariation = (Math.random() - 0.5) * 6
          const yesValue = Math.max(5, Math.min(50, yesBase + yesVariation))

          // For No: decreasing trend
          const noBase = 45 - (29 - i) * 0.8
          const noVariation = (Math.random() - 0.5) * 5
          const noValue = Math.max(15, Math.min(60, noBase + noVariation))

          // For Maybe: moderate oscillation
          const maybeBase = 20 + Math.sin((29 - i) * 0.2) * 8
          const maybeVariation = (Math.random() - 0.5) * 4
          const maybeValue = Math.max(
            10,
            Math.min(35, maybeBase + maybeVariation),
          )

          // For Unlikely: low and stable value
          const unlikelyBase = 10 + (Math.random() - 0.5) * 6
          const unlikelyValue = Math.max(2, Math.min(20, unlikelyBase))

          // Normalize to sum 100%
          const total = yesValue + noValue + maybeValue + unlikelyValue
          const normalizedYes = (yesValue / total) * 100
          const normalizedNo = (noValue / total) * 100
          const normalizedMaybe = (maybeValue / total) * 100
          const normalizedUnlikely = (unlikelyValue / total) * 100

          generatedData.push({
            date,
            yes: normalizedYes,
            no: normalizedNo,
            maybe: normalizedMaybe,
            unlikely: normalizedUnlikely,
          })
        }

        return { data: generatedData, series: defaultSeries }
      }

      const { data: genData, series: genSeries } = generateMultiSeriesData()
      setData(genData)
      setSeries(genSeries)
    }
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
        {/* Source/Fonte atrás do gráfico - estilo Polymarket */}
        <foreignObject
          x={margin.left + 8}
          y={height - 70}
          width={120}
          height={28}
        >
          <div
            style={{
              display: 'inline-block',
              background: 'rgba(229, 231, 235, 0.3)',
              color: 'rgba(209, 213, 219, 0.9)',
              borderRadius: '6px',
              padding: '4px 14px',
              fontSize: '10px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              pointerEvents: 'none',
              userSelect: 'none',
              width: 'fit-content',
            }}
          >
            Source:
            {' '}
            {process.env.NEXT_PUBLIC_SITE_NAME}
          </div>
        </foreignObject>

        <Group left={margin.left} top={margin.top}>
          {/* Grid lines horizontais pontilhadas - estilo Polymarket */}
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

          {/* Linha de 50% destacada */}
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

          {/* Linhas de dados com estilo Polymarket */}
          {series.map(seriesItem => (
            <LinePath<DataPoint>
              key={seriesItem.key}
              data={data}
              x={d => xScale(getDate(d))}
              y={d => yScale((d[seriesItem.key] as number) || 0)}
              stroke={seriesItem.color}
              strokeWidth={2.5}
              curve={curveMonotoneX}
              fill="transparent"
            />
          ))}

          {/* Markers circulares nas pontas - estilo Polymarket */}
          {data.length > 0
            && series.map(seriesItem => (
              <g key={`${seriesItem.key}-marker`}>
                {/* Círculo externo (borda branca) */}
                <circle
                  cx={getX(data[data.length - 1])}
                  cy={yScale(
                    (data[data.length - 1][seriesItem.key] as number) || 0,
                  )}
                  r={5}
                  fill="white"
                  stroke={seriesItem.color}
                  strokeWidth={2}
                />
                {/* Círculo interno */}
                <circle
                  cx={getX(data[data.length - 1])}
                  cy={yScale(
                    (data[data.length - 1][seriesItem.key] as number) || 0,
                  )}
                  r={3}
                  fill={seriesItem.color}
                />
              </g>
            ))}

          {/* Eixo direito com porcentagens - estilo Polymarket */}
          <AxisRight
            left={innerWidth}
            scale={yScale}
            tickFormat={value => `${value}%`}
            stroke="#344452"
            tickStroke="#344452"
            tickLabelProps={{
              fill: '#6b7280',
              fontSize: 11,
              textAnchor: 'start',
              dy: '0.33em',
              dx: '0.5em',
            }}
            numTicks={6}
            strokeWidth={1}
            tickLength={6}
          />

          {/* Eixo inferior com datas formato americano */}
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
            stroke="#344452"
            tickStroke="#344452"
            tickLabelProps={{
              fill: '#6b7280',
              fontSize: 11,
              textAnchor: 'middle',
            }}
            numTicks={6}
            strokeWidth={1}
            tickLength={6}
          />

          {/* Área interativa para tooltip */}
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

          {/* Linha vertical do tooltip */}
          {tooltipOpen && tooltipData && tooltipLeft !== undefined && (
            <line
              x1={tooltipLeft}
              x2={tooltipLeft}
              y1={0}
              y2={innerHeight}
              stroke="#6b7280"
              strokeWidth={1.5}
              strokeDasharray="2,2"
              opacity={0.7}
            />
          )}
        </Group>
      </svg>

      {/* Tooltip original unificado */}
      {tooltipOpen
        && tooltipData
        && tooltipLeft !== undefined
        && tooltipTop !== undefined && (
        <TooltipWithBounds
          key={Math.random()}
          top={tooltipTop + margin.top}
          left={tooltipLeft + margin.left}
          style={tooltipStyles}
        >
          <div>
            <div className="mb-2 border-b border-border pb-1 text-sm font-semibold text-card-foreground">
              {tooltipData.date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div className="space-y-1">
              {series.map(seriesItem => (
                <div
                  key={seriesItem.key}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="size-3 rounded-full border border-muted"
                      style={{ backgroundColor: seriesItem.color }}
                    />
                    <span className="text-muted-foreground">
                      {seriesItem.name}
                    </span>
                  </div>
                  <span className="font-bold text-card-foreground">
                    {((tooltipData[seriesItem.key] as number) || 0).toFixed(
                      1,
                    )}
                    %
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  )
}

export default PredictionChart
