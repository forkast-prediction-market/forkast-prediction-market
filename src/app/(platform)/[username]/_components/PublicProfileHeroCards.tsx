'use client'

import type { ReactNode } from 'react'
import type { PortfolioSnapshot } from '@/lib/portfolio'
import { CheckIcon, CircleHelpIcon, EyeIcon, FocusIcon, MinusIcon, TriangleIcon } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
      <CardContent className="relative flex h-full flex-col gap-2.5 p-3 sm:p-4">
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
                              {balance?.text ?? '0.00'}
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

function buildSparkline(values: number[], width = 100, height = 36) {
  if (!values.length) {
    return { line: '', area: '' }
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = width / Math.max(values.length - 1, 1)

  const points = values.map((value, index) => {
    const x = index * step
    const y = height - (((value - min) / range) * height)
    return { x, y }
  })

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')

  const area = `${line} L ${width} ${height} L 0 ${height} Z`

  return { line, area }
}

const defaultTimeframes: Record<string, number[]> = {
  '1D': [0.12, 0.09, 0.14, 0.11, 0.16, 0.13, 0.15],
  '1W': [0.18, 0.22, 0.17, 0.2, 0.19, 0.23, 0.24],
  '1M': [0.16, 0.15, 0.19, 0.18, 0.21, 0.2, 0.24, 0.23, 0.26, 0.25],
  'ALL': [0.14, 0.12, 0.17, 0.15, 0.22, 0.2, 0.19, 0.24, 0.23, 0.25, 0.26, 0.28],
}

function ProfitLossCard({
  snapshot,
  platformName = process.env.NEXT_PUBLIC_SITE_NAME!,
  platformLogoSvg = process.env.NEXT_PUBLIC_SITE_LOGO_SVG,
}: {
  snapshot: PortfolioSnapshot
  platformName?: string
  platformLogoSvg?: string
}) {
  const [activeTimeframe, setActiveTimeframe] = useState<keyof typeof defaultTimeframes>('ALL')
  const chartValues = defaultTimeframes[activeTimeframe] || defaultTimeframes.ALL
  const { line, area } = useMemo(
    () => buildSparkline(chartValues),
    [chartValues],
  )
  const gradientId = useId()
  const lineGradientId = `${gradientId}-line`
  const profitLoss = snapshot.profitLoss || 0
  const isPositive = profitLoss > 0
  const isNegative = profitLoss < 0

  return (
    <Card className="relative h-full overflow-hidden border border-border bg-background">
      <CardContent className="relative flex h-full flex-col gap-2.5 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full border text-xs',
                isPositive && 'border-yes/50 bg-yes/10 text-yes',
                isNegative && 'border-no/40 bg-no/10 text-no',
                !isPositive && !isNegative && 'border-border/60 bg-muted/40 text-muted-foreground',
              )}
            >
              {isPositive && <TriangleIcon className="size-4 -translate-y-px fill-current" />}
              {isNegative && <TriangleIcon className="size-4 translate-y-px rotate-180 fill-current" />}
              {!isPositive && !isNegative && <MinusIcon className="size-4" />}
            </span>
            <span className="text-base font-semibold text-foreground">Profit/Loss</span>
          </div>

          <div className="flex gap-2">
            {(Object.keys(defaultTimeframes) as Array<keyof typeof defaultTimeframes>).map(timeframe => (
              <Button
                key={timeframe}
                size="sm"
                variant={activeTimeframe === timeframe ? 'default' : 'ghost'}
                className={cn(
                  'h-8 px-3 text-xs font-semibold',
                  activeTimeframe === timeframe
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60',
                )}
                onClick={() => setActiveTimeframe(timeframe)}
              >
                {timeframe}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-2xl leading-none font-bold tracking-tight sm:text-3xl">
                {isPositive ? '+' : ''}
                {formatCurrency(Math.abs(profitLoss))}
              </p>
              <CircleHelpIcon className="size-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {({
                'ALL': 'All-Time',
                '1D': 'Past Day',
                '1W': 'Past Week',
                '1M': 'Past Month',
              } as const)[activeTimeframe] || 'All-Time'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground/70">
            {platformLogoSvg && (
              <div
                className="size-6 text-foreground/70 [&_*]:fill-current [&_*]:stroke-current"
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(platformLogoSvg) }}
              />
            )}
            <span className="text-2xl font-semibold">{platformName}</span>
          </div>
        </div>

        <div className="relative mt-auto h-24 w-full overflow-hidden sm:h-28">
          <svg viewBox="0 0 100 36" className="h-full w-full">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(58,131,250)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="rgb(132,94,247)" stopOpacity="0.06" />
              </linearGradient>
              <linearGradient id={lineGradientId} x1="0" y1="0" x2="100%" y2="0">
                <stop offset="0%" stopColor="#3BA5FF" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradientId})`} opacity="0.9" />
            <path d={line} fill="none" stroke={`url(#${lineGradientId})`} strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <div
            className={`
              pointer-events-none absolute inset-0 bg-linear-to-t from-background via-transparent/60 to-transparent
            `}
          />
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
      <ProfitLossCard snapshot={snapshot} platformLogoSvg={platformLogoSvg} platformName={platformName} />
    </div>
  )
}
