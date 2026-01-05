'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
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
    setIsLoading(true)

    fetchProfileLinkStats(statsAddress, controller.signal)
      .then((result) => {
        setStats(result)
        setHasLoaded(true)
      })
      .catch(() => {
        setStats(null)
        setHasLoaded(true)
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [hasLoaded, isOpen, statsAddress])

  const positionsLabel = stats
    ? formatCompactCount(stats.positions)
    : '—'
  const profitLossLabel = stats ? formatCompactCurrency(stats.profitLoss) : '—'
  const profitLossClass = stats
    ? (stats.profitLoss >= 0 ? 'text-yes' : 'text-no')
    : 'text-muted-foreground'
  const volumeLabel = stats?.volume != null ? formatVolume(stats.volume) : '—'

  return (
    <Tooltip onOpenChange={setIsOpen}>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex gap-3 py-2',
            children ? 'items-start' : 'items-center',
          )}
        >
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
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0 flex-1">
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
              {children}
            </div>
            {trailing
              ? (
                  <div className="ml-2 flex shrink-0 items-center text-right">
                    {trailing}
                  </div>
                )
              : null}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        hideArrow
        className="w-64 rounded-lg border border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg"
      >
        <div className="flex items-center gap-2">
          <Image
            src={user.image}
            alt={user.username}
            width={28}
            height={28}
            className="rounded-full"
          />
          <span className="truncate text-sm font-semibold">{user.username}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground">Positions</p>
            <p className="text-sm font-semibold tabular-nums">{positionsLabel}</p>
          </div>
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground">Profit/Loss</p>
            <p className={cn('text-sm font-semibold tabular-nums', profitLossClass)}>
              {profitLossLabel}
            </p>
          </div>
          <div className="space-y-1 text-xs">
            <p className="text-muted-foreground">Volume</p>
            <p className="text-sm font-semibold tabular-nums">{volumeLabel}</p>
          </div>
        </div>
        {!hasLoaded && isLoading && (
          <p className="mt-3 text-xs text-muted-foreground">Loading stats...</p>
        )}
        {hasLoaded && !stats && (
          <p className="mt-3 text-xs text-muted-foreground">Stats unavailable</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
