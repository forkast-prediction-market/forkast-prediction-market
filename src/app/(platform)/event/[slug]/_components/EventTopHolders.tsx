'use client'

import type { Event, TopHolder } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { AlertCircleIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import ProfileLink from '@/components/ProfileLink'
import ProfileLinkSkeleton from '@/components/ProfileLinkSkeleton'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPosition } from '@/lib/utils'
import { useIsBinaryMarket, useOrder } from '@/stores/useOrder'

interface EventTopHoldersProps {
  event: Event
}

interface HoldersResponse {
  yesHolders: TopHolder[]
  noHolders: TopHolder[]
}

async function fetchEventHolders(eventSlug: string, conditionId?: string): Promise<HoldersResponse> {
  const params = new URLSearchParams()
  if (conditionId) {
    params.set('condition_id', conditionId)
  }

  const url = `/api/events/${eventSlug}/holders${params.toString() ? `?${params}` : ''}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to load holders')
  }

  return response.json()
}

function useEventHolders(eventSlug: string, conditionId?: string) {
  return useQuery({
    queryKey: conditionId
      ? ['event-holders', eventSlug, conditionId]
      : ['event-holders', eventSlug],
    queryFn: () => fetchEventHolders(eventSlug, conditionId),
    enabled: true,
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    retry: 3,
  })
}

export default function EventTopHolders({ event }: EventTopHoldersProps) {
  const isBinaryMarket = useIsBinaryMarket()
  const orderState = useOrder()
  const [selectedMarket, setSelectedMarket] = useState<string>('')

  useEffect(() => {
    if (isBinaryMarket) {
      queueMicrotask(() => setSelectedMarket(''))
    }
    else if (orderState.market && !selectedMarket) {
      queueMicrotask(() => setSelectedMarket(orderState.market!.condition_id))
    }
    else if (!selectedMarket && event.markets.length > 0) {
      queueMicrotask(() => setSelectedMarket(event.markets[0].condition_id))
    }
  }, [isBinaryMarket, orderState.market, selectedMarket, event.markets])

  useEffect(() => {
    if (!isBinaryMarket && orderState.market && selectedMarket !== orderState.market.condition_id) {
      queueMicrotask(() => setSelectedMarket(orderState.market!.condition_id))
    }
  }, [isBinaryMarket, orderState.market, selectedMarket])

  const conditionId = isBinaryMarket ? undefined : (selectedMarket || undefined)
  const { data, isLoading, error } = useEventHolders(event.slug, conditionId)

  function handleMarketChange(conditionId: string) {
    setSelectedMarket(conditionId)

    const market = event.markets.find(m => m.condition_id === conditionId)
    if (market) {
      orderState.setMarket(market)
      if (market.outcomes.length > 0) {
        orderState.setOutcome(market.outcomes[0])
      }
    }
  }

  if (isLoading) {
    return (
      <div className="mt-6">
        <Skeleton className="mb-4 h-8 w-32" />
        <div className="grid grid-cols-2 gap-6">
          <div>
            <ProfileLinkSkeleton showPosition={true} showChildren={true} />
            <ProfileLinkSkeleton showPosition={true} showChildren={true} />
            <ProfileLinkSkeleton showPosition={true} showChildren={true} />
          </div>
          <div>
            <ProfileLinkSkeleton showPosition={true} showChildren={true} />
            <ProfileLinkSkeleton showPosition={true} showChildren={true} />
            <ProfileLinkSkeleton showPosition={true} showChildren={true} />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-6">
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Failed to load holders</AlertTitle>
        </Alert>
      </div>
    )
  }

  return (
    <div className="mt-6">
      {!isBinaryMarket && event.markets.length > 1 && (
        <div className="mb-4">
          <Select value={selectedMarket} onValueChange={handleMarketChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select market..." />
            </SelectTrigger>
            <SelectContent>
              {event.markets.map(market => (
                <SelectItem key={market.condition_id} value={market.condition_id}>
                  {market.short_title || market.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <span className="text-sm font-medium">Yes holders</span>
          <div className="mt-1 divide-y divide-border border-t">
            {!data?.yesHolders || data.yesHolders.length === 0
              ? <p className="py-2 text-sm text-muted-foreground">No holders found</p>
              : (
                  data.yesHolders.map((holder, index) => (
                    <ProfileLink
                      key={holder.user.address}
                      user={holder.user}
                      position={index + 1}
                    >
                      <span className="text-xs font-semibold text-yes">
                        {formatPosition(holder.net_position)}
                        {' '}
                        shares
                      </span>
                    </ProfileLink>
                  ))
                )}
          </div>
        </div>

        <div>
          <span className="text-sm font-medium">No holders</span>
          <div className="mt-1 divide-y divide-border border-t">
            {!data?.noHolders || data.noHolders.length === 0
              ? <p className="py-2 text-sm text-muted-foreground">No holders found</p>
              : (
                  data.noHolders.map((holder, index) => (
                    <ProfileLink
                      key={holder.user.address}
                      user={holder.user}
                      position={index + 1}
                    >
                      <span className="text-xs font-semibold text-no">
                        {formatPosition(holder.net_position)}
                        {' '}
                        shares
                      </span>
                    </ProfileLink>
                  ))
                )}
          </div>
        </div>
      </div>
    </div>
  )
}
