'use client'

import type { Event } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { CheckIcon, Clock3Icon, PlusIcon, SparkleIcon, TrophyIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate } from '@/lib/formatters'
import { isMarketNew } from '@/lib/utils'

interface EventMetaInformationProps {
  event: Event
}

export default function EventMetaInformation({ event }: EventMetaInformationProps) {
  const volumeRequestPayload = useMemo(() => {
    const conditions = event.markets
      .map((market) => {
        const tokenIds = (market.outcomes ?? [])
          .map(outcome => outcome.token_id)
          .filter(Boolean)
          .slice(0, 2)
        if (!market.condition_id || tokenIds.length < 2) {
          return null
        }
        return {
          condition_id: market.condition_id,
          token_ids: tokenIds as [string, string],
        }
      })
      .filter((item): item is { condition_id: string, token_ids: [string, string] } => item !== null)

    const signature = conditions
      .map(condition => `${condition.condition_id}:${condition.token_ids.join(':')}`)
      .join('|')

    return { conditions, signature }
  }, [event.markets])

  const { data: volumeFromApi } = useQuery({
    queryKey: ['trade-volumes', event.id, volumeRequestPayload.signature],
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
    return event.volume
  }, [event.volume, volumeFromApi])

  const isNegRiskEnabled = Boolean(event.enable_neg_risk || event.neg_risk)
  const shouldShowNew = event.markets.some(
    market => isMarketNew(market.created_at),
  )
  const expiryTooltip = 'This is estimated end date.<br>See rules below for specific resolution details.'
  const formattedVolume = Number.isFinite(resolvedVolume)
    ? (resolvedVolume || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00'
  const volumeLabel = `$${formattedVolume} Vol.`

  const maybeEndDate = event.end_date ? new Date(event.end_date) : null
  const expiryDate = maybeEndDate && !Number.isNaN(maybeEndDate.getTime()) ? maybeEndDate : null

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {shouldShowNew && (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          <SparkleIcon className="size-3.5 fill-current" stroke="currentColor" fill="currentColor" />
          <span>New</span>
        </span>
      )}
      {shouldShowNew && (
        <span className="mx-1.5 h-4 w-px bg-muted-foreground/40" aria-hidden="true" />
      )}
      <div className="flex items-center gap-2 text-foreground">
        {isNegRiskEnabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Negative risk details"
                className="inline-flex items-center justify-center text-foreground transition-colors"
              >
                <TrophyIcon className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={8}
              collisionPadding={16}
              hideArrow
              className="max-w-68 border border-border bg-background px-4 py-3 text-sm text-foreground shadow-xl"
            >
              <div className="flex flex-col gap-3 text-foreground">
                <span className="text-base font-bold text-foreground">Winner-take-all</span>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                    <span className="text-foreground">Only 1 winner</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                    <span className="text-foreground">Supports negative risk (convert No shares to Yes of the other options)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <PlusIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                    <span>
                      <span className="font-bold text-foreground">Complete negative risk</span>
                      {' '}
                      (users who convert will receive Yes shares in any outcomes added in the future)
                    </span>
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
        <span className="text-sm font-semibold text-foreground">{volumeLabel}</span>
      </div>
      {expiryDate && (
        <span className="mx-1.5 h-4 w-px bg-muted-foreground/40" aria-hidden="true" />
      )}
      {expiryDate && (
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1.5 text-sm leading-tight font-semibold text-muted-foreground">
              <Clock3Icon className="size-4 text-muted-foreground" strokeWidth={2.5} />
              <span>{formatDate(expiryDate)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={8}
            collisionPadding={16}
            hideArrow
            className="border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-xl"
          >
            <p
              dangerouslySetInnerHTML={{ __html: expiryTooltip! }}
              className="text-center"
            />
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
