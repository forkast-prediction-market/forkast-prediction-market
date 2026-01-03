'use client'

import type { EventMarketRow } from '@/app/(platform)/event/[slug]/_hooks/useEventMarketRows'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { memo, useMemo } from 'react'
import EventMarketChance from '@/app/(platform)/event/[slug]/_components/EventMarketChance'
import { Button } from '@/components/ui/button'
import { OUTCOME_INDEX } from '@/lib/constants'
import { formatCentsLabel } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface EventMarketCardProps {
  row: EventMarketRow
  showMarketIcon: boolean
  isExpanded: boolean
  isActiveMarket: boolean
  activeOutcomeIndex: number | null
  onToggle: () => void
  onBuy: (market: EventMarketRow['market'], outcomeIndex: number, source: 'mobile' | 'desktop') => void
  chanceHighlightKey: string
}

function EventMarketCardComponent({
  row,
  showMarketIcon,
  isExpanded,
  isActiveMarket,
  activeOutcomeIndex,
  onToggle,
  onBuy,
  chanceHighlightKey,
}: EventMarketCardProps) {
  const { market, yesOutcome, noOutcome, yesPriceValue, noPriceValue, chanceMeta } = row
  const yesOutcomeText = yesOutcome?.outcome_text ?? 'Yes'
  const noOutcomeText = noOutcome?.outcome_text ?? 'No'
  const volumeRequestPayload = useMemo(() => {
    const tokenIds = [yesOutcome?.token_id, noOutcome?.token_id].filter(Boolean) as string[]
    if (!market.condition_id || tokenIds.length < 2) {
      return { conditions: [], signature: '' }
    }

    const signature = `${market.condition_id}:${tokenIds.join(':')}`
    return {
      conditions: [{ condition_id: market.condition_id, token_ids: tokenIds.slice(0, 2) as [string, string] }],
      signature,
    }
  }, [market.condition_id, noOutcome?.token_id, yesOutcome?.token_id])

  const { data: volumeFromApi } = useQuery({
    queryKey: ['trade-volumes', market.condition_id, volumeRequestPayload.signature],
    enabled: volumeRequestPayload.conditions.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const response = await fetch(`${process.env.CLOB_URL}/data/volumes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          include_24h: false,
          conditions: volumeRequestPayload.conditions,
        }),
      })

      const payload = await response.json() as Array<{
        condition_id: string
        status: number
        volume?: string
      }>

      return payload
        .filter(entry => entry?.status === 200)
        .reduce((total, entry) => {
          const numeric = Number(entry.volume ?? 0)
          return Number.isFinite(numeric) ? total + numeric : total
        }, 0)
    },
  })

  const resolvedVolume = useMemo(() => {
    if (typeof volumeFromApi === 'number' && Number.isFinite(volumeFromApi)) {
      return volumeFromApi
    }
    return market.volume
  }, [market.volume, volumeFromApi])

  return (
    <div
      className={cn(
        `
          flex w-full cursor-pointer flex-col items-start p-4 transition-all duration-200 ease-in-out
          lg:flex-row lg:items-center lg:rounded-lg
        `,
        'hover:bg-black/5 dark:hover:bg-white/5',
      )}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggle()
        }
      }}
    >
      <div className="w-full lg:hidden">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showMarketIcon && market.icon_url && (
              <Image
                src={market.icon_url}
                alt={market.title}
                width={42}
                height={42}
                className="shrink-0 rounded-md"
              />
            )}
            <div>
              <div className="text-sm font-bold">
                {market.title}
              </div>
              <div className="text-xs text-muted-foreground">
                $
                {resolvedVolume?.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || '0.00'}
                {' '}
                Vol.
              </div>
            </div>
          </div>
          <EventMarketChance
            chanceMeta={chanceMeta}
            layout="mobile"
            highlightKey={chanceHighlightKey}
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="outcome"
            variant="yes"
            className={cn({
              'bg-yes text-white': isActiveMarket && activeOutcomeIndex === OUTCOME_INDEX.YES,
            })}
            onClick={(event) => {
              event.stopPropagation()
              onBuy(market, OUTCOME_INDEX.YES, 'mobile')
            }}
          >
            <span className="truncate opacity-70">
              Buy
              {' '}
              {' '}
              {yesOutcomeText}
            </span>
            <span className="shrink-0 text-base font-bold">
              {formatCentsLabel(yesPriceValue)}
            </span>
          </Button>
          <Button
            size="outcome"
            variant="no"
            className={cn({
              'bg-no text-white': isActiveMarket && activeOutcomeIndex === OUTCOME_INDEX.NO,
            })}
            onClick={(event) => {
              event.stopPropagation()
              onBuy(market, OUTCOME_INDEX.NO, 'mobile')
            }}
          >
            <span className="truncate opacity-70">
              Buy
              {' '}
              {' '}
              {noOutcomeText}
            </span>
            <span className="shrink-0 text-base font-bold">
              {formatCentsLabel(noPriceValue)}
            </span>
          </Button>
        </div>
      </div>

      <div className="hidden w-full items-center lg:flex">
        <div className="flex w-2/5 items-center gap-3">
          {showMarketIcon && market.icon_url && (
            <Image
              src={market.icon_url}
              alt={market.title}
              width={42}
              height={42}
              className="shrink-0 rounded-md"
            />
          )}
          <div>
            <div className="font-bold">
              {market.title}
            </div>
            <div className="text-xs text-muted-foreground">
              $
              {resolvedVolume?.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || '0.00'}
              {' '}
              Vol.
            </div>
          </div>
        </div>

        <div className="flex w-1/5 justify-center">
          <EventMarketChance
            chanceMeta={chanceMeta}
            layout="desktop"
            highlightKey={chanceHighlightKey}
          />
        </div>

        <div className="ms-auto flex items-center gap-2">
          <Button
            size="outcome"
            variant="yes"
            className={cn({
              'bg-yes text-white': isActiveMarket && activeOutcomeIndex === OUTCOME_INDEX.YES,
            }, 'w-36')}
            onClick={(event) => {
              event.stopPropagation()
              onBuy(market, OUTCOME_INDEX.YES, 'desktop')
            }}
          >
            <span className="truncate opacity-70">
              Buy
              {' '}
              {' '}
              {yesOutcomeText}
            </span>
            <span className="shrink-0 text-base font-bold">
              {formatCentsLabel(yesPriceValue)}
            </span>
          </Button>

          <Button
            size="outcome"
            variant="no"
            className={cn({
              'bg-no text-white': isActiveMarket && activeOutcomeIndex === OUTCOME_INDEX.NO,
            }, 'w-36')}
            onClick={(event) => {
              event.stopPropagation()
              onBuy(market, OUTCOME_INDEX.NO, 'desktop')
            }}
          >
            <span className="truncate opacity-70">
              Buy
              {' '}
              {' '}
              {noOutcomeText}
            </span>
            <span className="shrink-0 text-base font-bold">
              {formatCentsLabel(noPriceValue)}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}

const EventMarketCard = memo(EventMarketCardComponent)

export default EventMarketCard
