'use client'

import type { Event } from '@/types'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NewBadge } from '@/components/ui/new-badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatVolume, isMarketNew } from '@/lib/utils'

interface MentionsListProps {
  events: Event[]
}

const DAY_FORMATTER = new Intl.DateTimeFormat('en-US', { day: 'numeric' })
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short' })
const SCHEDULE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

export default function MentionsList({ events }: MentionsListProps) {
  return (
    <div className="mx-auto flex w-full flex-col gap-4 md:gap-5">
      {events.map(event => (
        <MentionsListItem key={event.id} event={event} />
      ))}
    </div>
  )
}

interface MentionsListItemProps {
  event: Event
}

function MentionsListItem({ event }: MentionsListItemProps) {
  const eventDate = getEventDate(event)
  const dayLabel = eventDate ? DAY_FORMATTER.format(eventDate) : 'TBD'
  const monthLabel = eventDate ? MONTH_FORMATTER.format(eventDate).toUpperCase() : undefined
  const scheduleLabel = eventDate ? SCHEDULE_FORMATTER.format(eventDate) : undefined

  const marketBadges = event.markets
    .map((market) => {
      const metadata = (market.metadata ?? {}) as Record<string, any>
      const shortTitle = typeof metadata.short_title === 'string' && metadata.short_title.trim()
        ? metadata.short_title.trim()
        : (market.short_title ?? market.title)
      return shortTitle
    })
    .filter((label): label is string => Boolean(label && label.trim()))

  const visibleBadges = marketBadges.slice(0, 2)
  const hiddenBadges = marketBadges.slice(2)

  const hasRecentMarket = event.markets.some(market => isMarketNew(market.created_at))
  const totalVolume = event.markets.reduce((acc, market) => acc + (market.total_volume ?? 0), 0)

  const statusBadge = hasRecentMarket
    ? (
        <NewBadge
          variant="soft"
          className="rounded-md px-2 py-1 text-[11px] font-semibold text-yellow-700 dark:text-yellow-200"
        />
      )
    : (
        <Badge
          variant="outline"
          className={cn(
            'rounded-md border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground',
          )}
        >
          {formatVolume(totalVolume)}
          {' '}
          Vol.
        </Badge>
      )

  return (
    <Link
      href={`/event/${event.slug}`}
      className={cn(
        'group relative flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-4 transition-all',
        'hover:-translate-y-0.5 hover:bg-card/50 hover:shadow-lg',
        'md:flex-row md:items-center md:gap-8 md:p-5',
      )}
    >
      <div className="flex items-start gap-3 md:w-[240px] md:flex-shrink-0 md:items-center md:gap-4">
        <div className="flex w-16 flex-col items-center justify-center leading-none md:w-[68px]">
          <span className="text-3xl font-bold tracking-tight text-foreground md:text-[34px]">
            {dayLabel}
          </span>
          {monthLabel && (
            <span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
              {monthLabel}
            </span>
          )}
        </div>
        <h2
          className={cn(
            'flex-1 text-base font-semibold text-foreground transition-colors',
            'md:hidden',
            'group-hover:text-foreground',
          )}
        >
          {event.title}
        </h2>

        <div
          className={cn(
            'relative h-16 w-16 overflow-hidden rounded-2xl border border-border/80 bg-muted/50 transition-transform',
            'duration-300 group-hover:scale-105 md:h-20 md:w-20',
          )}
        >
          <Image
            src={event.icon_url}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 4rem, 5rem"
            className="object-cover"
            priority={false}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 md:gap-3">
        <h2
          className={cn(
            'line-clamp-2 text-base font-semibold text-foreground transition-colors',
            'hidden md:block',
            'group-hover:text-foreground',
            'md:text-lg',
          )}
        >
          {event.title}
        </h2>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {statusBadge}
          {scheduleLabel && (
            <Badge
              variant="outline"
              className={cn(
                'rounded-md border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground',
              )}
            >
              {scheduleLabel}
            </Badge>
          )}
        </div>

        {(visibleBadges.length > 0 || hiddenBadges.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 md:ms-auto">
            {visibleBadges.map(label => (
              <Badge
                key={label}
                variant="outline"
                className={cn(
                  `
                    cursor-pointer rounded-md border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium
                    text-foreground transition-colors
                    hover:bg-card/70
                  `,
                )}
              >
                {label}
              </Badge>
            ))}

            {hiddenBadges.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn(
                      `
                        cursor-pointer rounded-md border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium
                        text-muted-foreground transition-colors
                        hover:bg-card/70
                      `,
                    )}
                  >
                    {`+${hiddenBadges.length}`}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={12}
                  className={cn(
                    `
                      max-w-[calc(100vw-2.5rem)] rounded-xl border border-border bg-background/95 p-3 text-sm
                      break-words whitespace-normal text-foreground shadow-xl backdrop-blur-sm
                      sm:max-w-[360px]
                    `,
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {hiddenBadges.map(label => (
                      <Badge
                        key={label}
                        variant="outline"
                        className={cn(
                          `
                            cursor-pointer rounded-md border border-border/60 bg-background/80 px-2.5 py-1 text-[11px]
                            font-medium text-muted-foreground transition-colors
                            hover:bg-card/70
                          `,
                        )}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      <div className="hidden md:flex md:w-[180px] md:flex-shrink-0 md:flex-col md:items-center md:justify-center">
        <Button asChild size="lg" className="px-6">
          <span>Trade</span>
        </Button>
      </div>
    </Link>
  )
}

function getEventDate(event: Event): Date | null {
  if (event.end_date) {
    const parsed = parseDateCandidate(event.end_date)
    if (parsed) {
      return parsed
    }
  }

  const eventMetadata = ((event as unknown as { metadata?: Record<string, any> }).metadata) ?? {}

  const metadataSources: Array<Record<string, any>> = [
    eventMetadata,
    ...event.markets.flatMap((market) => {
      const sources: Record<string, any>[] = []
      if (market.metadata && typeof market.metadata === 'object') {
        sources.push(market.metadata as Record<string, any>)
      }
      if (market.condition && typeof market.condition === 'object') {
        sources.push(market.condition as unknown as Record<string, any>)
      }
      return sources
    }),
  ]

  const candidates = metadataSources.flatMap(source => collectEndDateCandidates(source))

  if (candidates.length === 0) {
    return null
  }

  for (const candidate of candidates) {
    const parsed = parseDateCandidate(candidate)
    if (parsed) {
      return parsed
    }
  }

  return null
}

const END_KEY_PATTERNS = ['end', 'close', 'expiry', 'expire', 'resolution', 'settlement', 'deadline', 'final', 'conclude', 'finish']
const END_DATE_KEY_SET = new Set([
  'end_date',
  'enddate',
  'end_datetime',
  'enddatetime',
  'estimated_end_date',
  'estimatedenddate',
  'estimated_event_date',
  'estimatedeventdate',
  'event_end_date',
  'eventenddate',
  'close_date',
  'closedate',
  'resolution_date',
  'resolutiondate',
  'expires_at',
  'expiresat',
  'expiry',
  'expiry_date',
  'expirydate',
  'deadline',
  'deadline_at',
  'deadlineat',
  'settlement_date',
  'settlementdate',
  'concludes_at',
  'concludesat',
  'final_date',
  'finaldate',
  'end_time',
  'endtime',
  'end_timestamp',
  'endtimestamp',
])

function collectEndDateCandidates(source: unknown, parentKey: string = ''): string[] {
  if (!source || typeof source !== 'object') {
    return []
  }

  if (Array.isArray(source)) {
    return source.flatMap(item => collectEndDateCandidates(item, parentKey))
  }

  const candidates: string[] = []
  const entries = Object.entries(source as Record<string, any>)
  const parentHint = parentKey.toLowerCase()
  const parentMatches = END_KEY_PATTERNS.some(pattern => parentHint.includes(pattern)) || END_DATE_KEY_SET.has(parentHint)

  for (const [key, rawValue] of entries) {
    const value = rawValue as unknown
    if (value === null || value === undefined) {
      continue
    }

    const normalizedKey = key.toLowerCase()
    const keyMatches = END_KEY_PATTERNS.some(pattern => normalizedKey.includes(pattern)) || END_DATE_KEY_SET.has(normalizedKey)

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed && (keyMatches || parentMatches)) {
        candidates.push(trimmed)
      }
    }
    else if (typeof value === 'number' && Number.isFinite(value) && (keyMatches || parentMatches)) {
      const normalized = normalizeNumericDate(value)
      if (normalized) {
        candidates.push(normalized)
      }
    }
    else if (typeof value === 'object') {
      candidates.push(...collectEndDateCandidates(value, normalizedKey))
    }
  }

  const data = source as Record<string, any>
  if (
    parentMatches
    && typeof data.date === 'string'
    && typeof data.time === 'string'
  ) {
    const combined = `${data.date} ${data.time}`.trim()
    if (combined) {
      candidates.push(combined)
    }
  }

  return candidates
}

function normalizeNumericDate(value: number): string | null {
  if (value > 10_000_000_000) {
    return new Date(value).toISOString()
  }
  if (value > 1_000_000_000) {
    return new Date(value * 1000).toISOString()
  }
  return null
}

function parseDateCandidate(candidate: string): Date | null {
  if (!candidate) {
    return null
  }

  const numericCandidate = Number(candidate)
  if (!Number.isNaN(numericCandidate) && candidate.trim().length >= 9) {
    const normalized = normalizeNumericDate(numericCandidate)
    if (normalized) {
      const parsedNumeric = new Date(normalized)
      if (!Number.isNaN(parsedNumeric.getTime())) {
        return parsedNumeric
      }
    }
  }

  const parsed = new Date(candidate)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed
  }

  return null
}
