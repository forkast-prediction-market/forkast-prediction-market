'use client'

import type { MouseEvent as ReactMouseEvent, ReactNode, TouchEvent as ReactTouchEvent } from 'react'
import type { PortfolioSnapshot } from '@/lib/portfolio'
import { curveMonotoneX } from '@visx/curve'
import { localPoint } from '@visx/event'
import { Group } from '@visx/group'
import { scaleLinear, scaleTime } from '@visx/scale'
import { AreaClosed, LinePath } from '@visx/shape'
import { CheckIcon, CircleHelpIcon, EyeIcon, FocusIcon, MinusIcon, TriangleIcon } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useBalance } from '@/hooks/useBalance'
import { useClipboard } from '@/hooks/useClipboard'
import { usePortfolioValue } from '@/hooks/usePortfolioValue'
import { formatCurrency } from '@/lib/formatters'
import { cn, sanitizeSvg } from '@/lib/utils'

interface ProfileForCards {
  username: string
  avatarUrl: string
  joinedAt?: string
  viewsCount?: number
  portfolioAddress?: string | null
}

interface PnlPoint {
  date: Date
  value: number
}

const PNL_TIMEFRAMES = ['1D', '1W', '1M', 'ALL'] as const

interface PublicProfileHeroCardsProps {
  profile: ProfileForCards
  snapshot: PortfolioSnapshot
  platformName?: string
  platformLogoSvg?: string
  actions?: ReactNode
  variant?: 'public' | 'portfolio'
}

function ProfileOverviewCard({
  profile,
  snapshot,
  actions,
  variant = 'public',
}: {
  profile: ProfileForCards
  snapshot: PortfolioSnapshot
  actions?: ReactNode
  variant?: 'public' | 'portfolio'
}) {
  const { copied, copy } = useClipboard()
  const { value: livePositionsValue, isLoading } = usePortfolioValue(profile.portfolioAddress)
  const hasLiveValue = Boolean(profile.portfolioAddress) && !isLoading
  const positionsValue = hasLiveValue ? livePositionsValue ?? snapshot.positionsValue : snapshot.positionsValue
  const { balance, isLoadingBalance } = useBalance()
  const shouldWaitForBalance = variant === 'portfolio'
  const isInitialLoading = shouldWaitForBalance ? isLoadingBalance || isLoading : isLoading
  const [hasLoaded, setHasLoaded] = useState(!isInitialLoading)
  useEffect(() => {
    if (!isInitialLoading) {
      setHasLoaded(true)
    }
  }, [isInitialLoading])
  const isReady = hasLoaded
  const totalPortfolioValue = (positionsValue ?? 0) + (balance?.raw ?? 0)
  const formattedTotalValue = formatCurrency(totalPortfolioValue)
  const formattedCashValue = Number.isFinite(balance?.raw)
    ? (balance?.raw ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00'
  const joinedText = useMemo(() => {
    if (!profile.joinedAt) {
      return null
    }
    const date = new Date(profile.joinedAt)
    if (Number.isNaN(date.getTime())) {
      return null
    }
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [profile.joinedAt])

  const stats = [
    { label: 'Positions Value', value: formatCurrency(positionsValue) },
    { label: 'Biggest Win', value: formatCurrency(snapshot.biggestWin) },
    { label: 'Predictions', value: snapshot.predictions ? snapshot.predictions.toLocaleString('en-US') : '0' },
  ]

  return (
    <Card className="relative h-full overflow-hidden border border-border bg-background">
      <CardContent className="relative flex h-full flex-col gap-2 p-3 sm:p-4">
        {isReady
          ? (
              <>
                {variant === 'portfolio'
                  ? (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="text-sm font-semibold tracking-wide text-muted-foreground">Portfolio</span>
                          <p className="text-3xl leading-tight font-bold text-foreground sm:text-4xl">
                            {formattedTotalValue}
                          </p>
                          <div
                            className={cn(
                              'flex items-center gap-2 text-sm font-semibold',
                              snapshot.profitLoss > 0
                                ? 'text-yes'
                                : snapshot.profitLoss < 0
                                  ? 'text-no'
                                  : 'text-muted-foreground',
                            )}
                          >
                            <span>
                              {snapshot.profitLoss >= 0 ? '+' : '-'}
                              {formatCurrency(Math.abs(snapshot.profitLoss))}
                            </span>
                            <span>
                              (
                              {positionsValue > 0
                                ? `${((snapshot.profitLoss / positionsValue) * 100).toFixed(2)}%`
                                : '0.00%'}
                              )
                            </span>
                            <span className="text-muted-foreground">Today</span>
                          </div>
                        </div>

                        <div
                          className={`
                            flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-2
                            shadow-sm
                          `}
                        >
                          <div className="relative size-6">
                            <Image src="/images/trade/money.svg" alt="Cash" fill sizes="24px" className="object-contain" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-extrabold text-foreground">
                              $
                              {formattedCashValue}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  : (
                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div
                            className={`
                              relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full
                              border border-border/60 bg-muted/40
                            `}
                          >
                            {profile.avatarUrl
                              ? (
                                  <Image
                                    src={profile.avatarUrl}
                                    alt={`${profile.username} avatar`}
                                    fill
                                    className="object-cover"
                                  />
                                )
                              : (
                                  <span className="text-lg font-semibold text-muted-foreground uppercase">
                                    {profile.username.slice(0, 2)}
                                  </span>
                                )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="truncate text-lg leading-tight font-semibold sm:text-xl" title={profile.username}>
                              {profile.username}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              {joinedText && (
                                <span className="inline-flex items-center gap-1">
                                  Joined
                                  {' '}
                                  {joinedText}
                                </span>
                              )}
                              {typeof profile.viewsCount === 'number' && (
                                <>
                                  <span aria-hidden className="text-muted-foreground/50">•</span>
                                  <span className="inline-flex items-center gap-1">
                                    <EyeIcon className="size-4" />
                                    {profile.viewsCount.toLocaleString('en-US')}
                                    {' '}
                                    views
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {profile.portfolioAddress && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`
                              size-9 rounded-full border border-border/60 bg-background/60 text-muted-foreground
                              shadow-sm transition-colors
                              hover:bg-background
                            `}
                            onClick={() => profile.portfolioAddress && copy(profile.portfolioAddress)}
                            aria-label="Copy portfolio address"
                          >
                            {copied ? <CheckIcon className="size-4 text-yes" /> : <FocusIcon className="size-4" />}
                          </Button>
                        )}
                      </div>
                    )}

                <div className="mt-auto pt-1">
                  {actions ?? (
                    <div className="grid grid-cols-3 gap-2.5">
                      {stats.map((stat, index) => (
                        <div
                          key={stat.label}
                          className={cn(
                            'space-y-1 rounded-lg bg-background/40 p-2 shadow-sm',
                            index > 0 && 'border-l border-border/50',
                          )}
                        >
                          <p className="text-sm font-medium text-muted-foreground">
                            {stat.label}
                          </p>
                          <p className="text-xl font-semibold tracking-tight text-foreground">
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          : (
              <div className="space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
            )}
      </CardContent>
    </Card>
  )
}

function ProfitLossCard({
  snapshot: _snapshot,
  portfolioAddress,
  platformName = process.env.NEXT_PUBLIC_SITE_NAME!,
  platformLogoSvg = process.env.NEXT_PUBLIC_SITE_LOGO_SVG,
}: {
  snapshot: PortfolioSnapshot
  portfolioAddress?: string | null
  platformName?: string
  platformLogoSvg?: string
}) {
  const [activeTimeframe, setActiveTimeframe] = useState<(typeof PNL_TIMEFRAMES)[number]>('ALL')
  const [cursorX, setCursorX] = useState<number | null>(null)
  const [pnlSeries, setPnlSeries] = useState<PnlPoint[]>([])
  const timeRangeContainerRef = useRef<HTMLDivElement | null>(null)
  const timeRangeRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [timeRangeIndicator, setTimeRangeIndicator] = useState({ width: 0, left: 0 })
  const [timeRangeIndicatorReady, setTimeRangeIndicatorReady] = useState(false)
  const chartId = useId().replace(/:/g, '')
  const lineGradientId = `${chartId}-line`
  const areaGradientId = `${chartId}-area`
  const areaFadeId = `${chartId}-fade`
  const areaMaskId = `${chartId}-mask`
  const logoSvg = sanitizeSvg(platformLogoSvg || '')
    .replace(/fill="url\([^"]+\)"/gi, 'fill="currentColor"')
  const pnlAddress = portfolioAddress
  const pnlBaseUrl = process.env.USER_PNL_URL ?? 'https://user-pnl-api.forka.st'

  useEffect(() => {
    if (!pnlAddress || !pnlBaseUrl) {
      setPnlSeries([])
      return
    }

    const controller = new AbortController()
    const timeframeConfig = {
      '1D': { interval: '1d', fidelity: '1h' },
      '1W': { interval: '1w', fidelity: '3h' },
      '1M': { interval: '1m', fidelity: '18h' },
      'ALL': { interval: 'all', fidelity: '12h' },
    } as const
    const { interval, fidelity } = timeframeConfig[activeTimeframe] ?? timeframeConfig.ALL
    const params = new URLSearchParams({
      user_address: pnlAddress,
      interval,
      fidelity,
    })
    const endpoint = new URL('/user-pnl', pnlBaseUrl)

    fetch(`${endpoint.toString()}?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`PNL request failed: ${response.status}`)
        }
        return await response.json()
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          setPnlSeries([])
          return
        }

        const normalized = data
          .map((point: { t?: number, p?: number }) => ({
            date: typeof point.t === 'number' ? new Date(point.t * 1000) : null,
            value: typeof point.p === 'number' ? point.p : null,
          }))
          .filter(point => point.date && Number.isFinite(point.value))
          .map(point => ({ date: point.date as Date, value: point.value as number }))
          .sort((a, b) => a.date.getTime() - b.date.getTime())

        setPnlSeries(normalized)
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setPnlSeries([])
        }
      })

    return () => controller.abort()
  }, [activeTimeframe, pnlAddress, pnlBaseUrl])

  const updateIndicator = useCallback(() => {
    const activeIndex = PNL_TIMEFRAMES.findIndex(range => range === activeTimeframe)
    const activeButton = timeRangeRefs.current[activeIndex]
    const container = timeRangeContainerRef.current
    if (!activeButton || !container) {
      return
    }

    const { offsetLeft, offsetWidth } = activeButton
    queueMicrotask(() => {
      setTimeRangeIndicator({ left: offsetLeft, width: offsetWidth })
      setTimeRangeIndicatorReady(true)
    })
  }, [activeTimeframe])

  useLayoutEffect(() => {
    updateIndicator()
  }, [updateIndicator])

  useEffect(() => {
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [updateIndicator])

  const fallbackRange = useMemo(() => ({ startValue: 0, endValue: 0 }), [])
  const fallbackDurationMs = useMemo(() => {
    const ranges = {
      '1D': 1000 * 60 * 60 * 24,
      '1W': 1000 * 60 * 60 * 24 * 7,
      '1M': 1000 * 60 * 60 * 24 * 30,
      'ALL': 1000 * 60 * 60 * 24 * 365,
    }
    return ranges[activeTimeframe] ?? ranges.ALL
  }, [activeTimeframe])
  const fallbackEndDate = useMemo(() => new Date(), [])
  const fallbackStartDate = useMemo(
    () => new Date(fallbackEndDate.getTime() - fallbackDurationMs),
    [fallbackDurationMs, fallbackEndDate],
  )
  const fallbackData = useMemo(() => {
    const points = 24
    return Array.from({ length: points }, (_, index) => {
      const t = points <= 1 ? 0 : index / (points - 1)
      return {
        date: new Date(fallbackStartDate.getTime() + (fallbackEndDate.getTime() - fallbackStartDate.getTime()) * t),
        value: fallbackRange.startValue + (fallbackRange.endValue - fallbackRange.startValue) * t,
      }
    })
  }, [fallbackEndDate, fallbackRange, fallbackStartDate])

  const hasPnlSeries = pnlSeries.length > 0
  const chartData = hasPnlSeries ? pnlSeries : fallbackData
  const startDate = chartData[0]?.date ?? fallbackStartDate
  const endDate = chartData[chartData.length - 1]?.date ?? fallbackEndDate
  const startValue = chartData[0]?.value ?? fallbackRange.startValue
  const endValue = chartData[chartData.length - 1]?.value ?? fallbackRange.endValue

  const chartWidth = 360
  const chartHeight = 80
  const margin = { top: 0, right: 0, bottom: 0, left: 0 }
  const innerWidth = chartWidth - margin.left - margin.right
  const innerHeight = chartHeight - margin.top - margin.bottom
  const linePadding = Math.round(innerHeight * 0.22)
  const lineTop = linePadding
  const lineBottom = innerHeight - linePadding
  const [minValue, maxValue] = useMemo(() => {
    if (!chartData.length) {
      return [0, 0]
    }
    let min = chartData[0].value
    let max = chartData[0].value
    for (const point of chartData) {
      if (point.value < min) {
        min = point.value
      }
      if (point.value > max) {
        max = point.value
      }
    }
    return [min, max]
  }, [chartData])
  const domainPadding = minValue === maxValue ? Math.max(1, Math.abs(minValue || 1)) : 0
  const paddedMin = minValue - domainPadding
  const paddedMax = maxValue + domainPadding

  const xScale = useMemo(
    () => scaleTime<number>({
      range: [0, innerWidth],
      domain: [startDate, endDate],
    }),
    [endDate, innerWidth, startDate],
  )
  const yScale = useMemo(
    () => scaleLinear<number>({
      range: [lineBottom, lineTop],
      domain: [paddedMin, paddedMax],
      nice: false,
    }),
    [lineBottom, lineTop, paddedMax, paddedMin],
  )

  const clampedCursorX = cursorX == null ? null : Math.max(0, Math.min(cursorX, innerWidth))
  const cursorDate = useMemo(
    () => (clampedCursorX == null ? null : xScale.invert(clampedCursorX)),
    [clampedCursorX, xScale],
  )
  const cursorValue = useMemo(() => {
    if (clampedCursorX == null || !chartData.length) {
      return endValue
    }
    if (chartData.length === 1) {
      return chartData[0].value
    }

    const targetTime = cursorDate ? cursorDate.getTime() : endDate.getTime()
    let left = chartData[0]
    let right = chartData[chartData.length - 1]

    for (const point of chartData) {
      if (point.date.getTime() <= targetTime) {
        left = point
      }
      else {
        right = point
        break
      }
    }

    if (left === right) {
      return left.value
    }

    const span = right.date.getTime() - left.date.getTime()
    const ratio = span === 0 ? 0 : (targetTime - left.date.getTime()) / span
    return left.value + (right.value - left.value) * ratio
  }, [chartData, clampedCursorX, cursorDate, endDate, endValue])
  const displayValue = clampedCursorX == null ? endValue : cursorValue
  const deltaValue = displayValue - startValue
  const isDeltaPositive = deltaValue > 0
  const isDeltaNegative = deltaValue < 0
  const [gainTotal, lossTotal] = useMemo(() => {
    if (!chartData.length) {
      return [0, 0]
    }

    const targetTime = (cursorDate ?? endDate).getTime()
    const firstPoint = chartData[0]
    const firstTime = firstPoint.date.getTime()

    if (targetTime < firstTime) {
      return [0, 0]
    }

    let gain = 0
    let loss = 0
    let prevValue = 0
    let prevTime = firstTime

    const initialDelta = firstPoint.value - prevValue
    if (initialDelta >= 0) {
      gain += initialDelta
    }
    else {
      loss += Math.abs(initialDelta)
    }
    prevValue = firstPoint.value

    for (let index = 1; index < chartData.length; index += 1) {
      const point = chartData[index]
      const pointTime = point.date.getTime()

      if (pointTime <= targetTime) {
        const delta = point.value - prevValue
        if (delta >= 0) {
          gain += delta
        }
        else {
          loss += Math.abs(delta)
        }
        prevValue = point.value
        prevTime = pointTime
        continue
      }

      if (targetTime > prevTime) {
        const span = pointTime - prevTime
        const ratio = span === 0 ? 0 : (targetTime - prevTime) / span
        const interpolatedValue = prevValue + (point.value - prevValue) * ratio
        const delta = interpolatedValue - prevValue
        if (delta >= 0) {
          gain += delta
        }
        else {
          loss += Math.abs(delta)
        }
      }
      break
    }

    return [gain, loss]
  }, [chartData, cursorDate, endDate])
  const timeframeLabel = ({
    'ALL': 'All-Time',
    '1D': 'Past Day',
    '1W': 'Past Week',
    '1M': 'Past Month',
  } as const)[activeTimeframe] || 'All-Time'
  const hoverDateLabel = cursorDate
    ? `${cursorDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${
      cursorDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }`
    : null

  const handlePointerMove = useCallback((event: ReactTouchEvent<SVGRectElement> | ReactMouseEvent<SVGRectElement>) => {
    const point = localPoint(event)
    if (!point) {
      return
    }
    setCursorX(point.x)
  }, [])

  const handlePointerLeave = useCallback(() => {
    setCursorX(null)
  }, [])

  return (
    <Card className="relative h-full overflow-hidden border border-border bg-background">
      <CardContent className="relative flex h-full flex-col gap-2.5 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            {isDeltaPositive && <TriangleIcon className="size-4 -translate-y-px fill-yes text-yes" />}
            {isDeltaNegative && <TriangleIcon className="size-4 translate-y-px rotate-180 fill-no text-no" />}
            {!isDeltaPositive && !isDeltaNegative && <MinusIcon className="size-4 text-muted-foreground" />}
            <span className="text-base font-semibold text-foreground">
              Profit/Loss
            </span>
          </div>

          <div
            ref={timeRangeContainerRef}
            className="relative flex items-center justify-start gap-2 text-xs font-semibold"
          >
            <div
              className={cn(
                'absolute inset-y-0 rounded-md bg-muted',
                timeRangeIndicatorReady ? 'opacity-100 transition-all duration-300' : 'opacity-0 transition-none',
              )}
              style={{
                width: `${timeRangeIndicator.width}px`,
                left: `${timeRangeIndicator.left}px`,
              }}
              aria-hidden={!timeRangeIndicatorReady}
            />
            {PNL_TIMEFRAMES.map((timeframe, index) => (
              <button
                key={timeframe}
                ref={(el) => {
                  timeRangeRefs.current[index] = el
                }}
                type="button"
                className={cn(
                  'relative rounded-md px-3 py-2 transition-colors',
                  activeTimeframe === timeframe
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
                onClick={() => setActiveTimeframe(timeframe)}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="flex items-center gap-2 text-2xl leading-none font-bold tracking-tight sm:text-3xl">
                <span>
                  {displayValue < 0 ? '-' : '+'}
                  {formatCurrency(Math.abs(displayValue))}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex translate-y-[1px] text-muted-foreground hover:text-foreground"
                    >
                      <CircleHelpIcon className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    align="start"
                    sideOffset={8}
                    hideArrow
                    className={`
                      w-56 rounded-md border border-border/60 bg-background p-3 text-left text-xs font-semibold
                      text-foreground shadow-lg
                    `}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Gain</span>
                        <span>
                          +
                          {formatCurrency(Math.abs(gainTotal))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Loss</span>
                        <span>
                          -
                          {formatCurrency(Math.abs(lossTotal))}
                        </span>
                      </div>
                      <div className="h-px w-full bg-border/60" />
                      <div className="flex items-center justify-between">
                        <span>Net total</span>
                        <span>
                          {displayValue < 0 ? '-' : '+'}
                          {formatCurrency(Math.abs(displayValue))}
                        </span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {hoverDateLabel ?? timeframeLabel}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xl text-muted-foreground/70">
            {platformLogoSvg && (
              <div
                className={`
                  h-[1em] w-[1em] text-current
                  [&_svg]:h-[1em] [&_svg]:w-[1em]
                  [&_svg_*]:fill-current [&_svg_*]:stroke-current
                `}
                dangerouslySetInnerHTML={{ __html: logoSvg }}
              />
            )}
            <span className="font-semibold">{platformName}</span>
          </div>
        </div>

        <div className="relative mt-auto h-12 w-full overflow-hidden sm:h-18">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id={lineGradientId}
                x1="0"
                y1={lineTop}
                x2="0"
                y2={lineBottom}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <linearGradient
                id={areaGradientId}
                x1="0"
                y1={lineTop}
                x2="0"
                y2={lineBottom}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id={areaFadeId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
              <mask id={areaMaskId} maskUnits="userSpaceOnUse">
                <rect
                  x="0"
                  y="0"
                  width={innerWidth}
                  height={innerHeight}
                  fill={`url(#${areaFadeId})`}
                />
              </mask>
            </defs>

            <Group left={margin.left} top={margin.top}>
              <AreaClosed
                data={chartData}
                x={d => xScale(d.date)}
                y={d => yScale(d.value)}
                y0={innerHeight}
                yScale={yScale}
                stroke="none"
                fill={`url(#${areaGradientId})`}
                mask={`url(#${areaMaskId})`}
                curve={curveMonotoneX}
              />

              <LinePath
                data={chartData}
                x={d => xScale(d.date)}
                y={d => yScale(d.value)}
                stroke={`url(#${lineGradientId})`}
                strokeWidth={2}
                curve={curveMonotoneX}
              />

              {clampedCursorX != null && (
                <line
                  x1={clampedCursorX}
                  x2={clampedCursorX}
                  y1={0}
                  y2={innerHeight}
                  stroke="white"
                  strokeWidth={1}
                  strokeOpacity={0.7}
                />
              )}

              <rect
                x={0}
                y={0}
                width={innerWidth}
                height={innerHeight}
                fill="transparent"
                onMouseMove={handlePointerMove}
                onMouseLeave={handlePointerLeave}
                onTouchStart={handlePointerMove}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerLeave}
              />
            </Group>
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PublicProfileHeroCards({
  profile,
  snapshot,
  platformLogoSvg,
  platformName,
  actions,
  variant = 'public',
}: PublicProfileHeroCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ProfileOverviewCard profile={profile} snapshot={snapshot} actions={actions} variant={variant} />
      <ProfitLossCard
        snapshot={snapshot}
        platformLogoSvg={platformLogoSvg}
        platformName={platformName}
        portfolioAddress={profile.portfolioAddress}
      />
    </div>
  )
}
