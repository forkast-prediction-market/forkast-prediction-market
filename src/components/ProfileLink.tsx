'use client'

import type { ReactNode } from 'react'
import type { ProfileForCards } from '@/components/ProfileOverviewCard'
import type { PortfolioSnapshot } from '@/lib/portfolio'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import ProfileOverviewCard from '@/components/ProfileOverviewCard'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fetchProfileLinkStats } from '@/lib/data-api/profile-link-stats'
import {
  formatCompactCount,
  formatCompactCurrency,
  formatTimeAgo,
  formatVolume,
} from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface ProfileLinkProps {
  user: {
    address: string
    proxy_wallet_address?: string | null
    image: string
    username: string
  }
  position?: number
  date?: string
  children?: ReactNode
  trailing?: ReactNode
  usernameMaxWidthClassName?: string
  usernameClassName?: string
}

export default function ProfileLink({
  user,
  position,
  date,
  children,
  trailing,
  usernameMaxWidthClassName,
  usernameClassName,
}: ProfileLinkProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchProfileLinkStats>>>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  const medalColor = {
    1: '#FFD700',
    2: '#C0C0C0',
    3: '#CD7F32',
  }[position ?? 0] ?? '#000000'

  const medalTextColor = medalColor === '#000000' ? '#ffffff' : '#1a1a1a'
  const profileHref = `/@${user.username}` as any
  const statsAddress = useMemo(
    () => user.proxy_wallet_address ?? user.address,
    [user.address, user.proxy_wallet_address],
  )

  useEffect(() => {
    setStats(null)
    setHasLoaded(false)
    setIsLoading(false)
  }, [statsAddress])

  useEffect(() => {
    if (!isOpen || hasLoaded) {
      return
    }

    if (!statsAddress) {
      setHasLoaded(true)
      return
    }

    const controller = new AbortController()
    let isActive = true
    setIsLoading(true)

    fetchProfileLinkStats(statsAddress, controller.signal)
      .then((result) => {
        if (!isActive || controller.signal.aborted) {
          return
        }
        setStats(result)
        setHasLoaded(true)
      })
      .catch((error) => {
        if (!isActive || controller.signal.aborted || error?.name === 'AbortError') {
          return
        }
        setStats(null)
        setHasLoaded(true)
      })
      .finally(() => {
        if (!isActive || controller.signal.aborted) {
          return
        }
        setIsLoading(false)
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [hasLoaded, isOpen, statsAddress])

  const positionsLabel = stats
    ? formatCompactCount(stats.positions)
    : '—'
  const profitLossLabel = stats ? formatCompactCurrency(stats.profitLoss) : '—'
  const profitLossClass = stats
    ? (stats.profitLoss >= 0 ? 'text-yes' : 'text-no')
    : 'text-muted-foreground'
  const volumeLabel = stats?.volume != null ? formatVolume(stats.volume) : '—'
  const tooltipProfile = useMemo<ProfileForCards>(() => ({
    username: user.username,
    avatarUrl: user.image,
    portfolioAddress: null,
  }), [user.image, user.username])
  const tooltipSnapshot = useMemo<PortfolioSnapshot>(() => ({
    positionsValue: 0,
    profitLoss: stats?.profitLoss ?? 0,
    predictions: stats?.positions ?? 0,
    biggestWin: 0,
  }), [stats?.positions, stats?.profitLoss])

  const tooltipActions = (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: 'Positions', value: positionsLabel, valueClassName: 'text-foreground' },
          { label: 'Profit/Loss', value: profitLossLabel, valueClassName: profitLossClass },
          { label: 'Volume', value: volumeLabel, valueClassName: 'text-foreground' },
        ].map((stat, index) => (
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
            <p className={cn('text-xl font-semibold tracking-tight', stat.valueClassName)}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
      {!hasLoaded && isLoading && (
        <p className="text-xs text-muted-foreground">Loading stats...</p>
      )}
      {hasLoaded && !stats && (
        <p className="text-xs text-muted-foreground">Stats unavailable</p>
      )}
    </div>
  )

  return (
    <Tooltip onOpenChange={setIsOpen}>
      <div
        className={cn(
          'flex gap-3 py-2',
          children ? 'items-start' : 'items-center',
        )}
      >
        <div className="min-w-0 flex-1">
          <TooltipTrigger asChild>
            <div className="inline-flex min-w-0 items-center gap-3">
              <Link href={profileHref} className="relative shrink-0">
                <Image
                  src={user.image}
                  alt={user.username}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                {position && (
                  <Badge
                    variant="secondary"
                    style={{ backgroundColor: medalColor, color: medalTextColor }}
                    className={`
                      absolute top-0 -right-2 size-5 rounded-full px-1 font-mono text-muted-foreground tabular-nums
                    `}
                  >
                    {position}
                  </Badge>
                )}
              </Link>
              <div className="min-w-0">
                <div
                  className={cn(
                    'flex min-w-0 items-center gap-1',
                    usernameMaxWidthClassName ?? 'max-w-32 lg:max-w-64',
                  )}
                >
                  <Link
                    href={profileHref}
                    className={cn('truncate text-sm font-medium', usernameClassName)}
                  >
                    {user.username}
                  </Link>
                  {date && (
                    <span className="text-xs whitespace-nowrap text-muted-foreground">
                      {formatTimeAgo(date)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </TooltipTrigger>
          {children
            ? <div className="pl-[44px]">{children}</div>
            : null}
        </div>
        {trailing
          ? (
              <div className="ml-2 flex shrink-0 items-center text-right">
                {trailing}
              </div>
            )
          : null}
      </div>
      <TooltipContent
        side="top"
        align="start"
        sideOffset={8}
        hideArrow
        className="border-none bg-transparent p-0 text-popover-foreground shadow-none"
      >
        <ProfileOverviewCard
          profile={tooltipProfile}
          snapshot={tooltipSnapshot}
          actions={tooltipActions}
          useDefaultUserWallet={false}
        />
      </TooltipContent>
    </Tooltip>
  )
}
