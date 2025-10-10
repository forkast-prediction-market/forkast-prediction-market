'use client'

import type { Event, HoldersResponse, TopHolder } from '@/types'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatPosition, truncateAddress } from '@/lib/utils'
import { useIsBinaryMarket, useOrder } from '@/stores/useOrder'

interface EventTopHoldersProps {
  event: Event
}

interface HoldersState {
  yesHolders: TopHolder[]
  noHolders: TopHolder[]
  loading: boolean
  error: string | null
}

export default function EventTopHolders({ event }: EventTopHoldersProps) {
  const [state, setState] = useState<HoldersState>({
    yesHolders: [],
    noHolders: [],
    loading: true,
    error: null,
  })

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

  useEffect(() => {
    const abortController = new AbortController()

    async function fetchHolders() {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }))

        const params = new URLSearchParams()
        if (!isBinaryMarket && selectedMarket) {
          params.set('condition_id', selectedMarket)
        }

        const url = `/api/events/${event.slug}/holders${params.toString() ? `?${params}` : ''}`
        const response = await fetch(url, {
          signal: abortController.signal,
        })

        if (!response.ok) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Failed to load holders',
          }))

          return
        }

        const data: HoldersResponse = await response.json()

        setState({
          yesHolders: data.yesHolders,
          noHolders: data.noHolders,
          loading: false,
          error: null,
        })
      }
      catch {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load holders',
        }))
      }
    }

    if (isBinaryMarket || selectedMarket) {
      queueMicrotask(() => fetchHolders())
    }

    return () => {
      abortController.abort()
    }
  }, [event.slug, isBinaryMarket, selectedMarket])

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

  if (state.loading) {
    return (
      <div className="mt-6">
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Loading top holders...</p>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="mt-6">
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">{state.error}</p>
        </div>
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
          <div className="mb-3 flex justify-between">
            <span className="text-sm font-medium">Yes holders</span>
            <span className="text-xs font-medium text-muted-foreground uppercase">Shares</span>
          </div>

          <div className="divide-y divide-border border-t">
            {state.yesHolders.length === 0
              ? <p className="py-2 text-sm text-muted-foreground">No holders found</p>
              : (
                  state.yesHolders.map(holder => (
                    <div
                      key={`${holder.user.id}-${holder.outcomeIndex}`}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={holder.user.image || `https://avatar.vercel.sh/${holder.user.address}.png`}
                          alt={holder.user.username || holder.user.address}
                          width={32}
                          height={32}
                          className="shrink-0 rounded-full"
                        />
                        <span className="max-w-28 truncate text-sm font-medium">
                          {holder.user.username || truncateAddress(holder.user.address)}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-yes">
                        {formatPosition(holder.netPosition)}
                      </span>
                    </div>
                  ))
                )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex justify-between">
            <span className="text-sm font-medium">No holders</span>
            <span className="text-xs font-medium text-muted-foreground uppercase">Shares</span>
          </div>
          <div className="divide-y divide-border border-t">
            {state.noHolders.length === 0
              ? <p className="py-2 text-sm text-muted-foreground">No holders found</p>
              : (
                  state.noHolders.map(holder => (
                    <div
                      key={`${holder.user.id}-${holder.outcomeIndex}`}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={holder.user.image || `https://avatar.vercel.sh/${holder.user.address}.png`}
                          alt={holder.user.username || holder.user.address}
                          width={32}
                          height={32}
                          className="shrink-0 rounded-full"
                        />
                        <span className="text-sm font-medium">
                          {holder.user.username || truncateAddress(holder.user.address)}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-no">
                        {formatPosition(holder.netPosition)}
                      </span>
                    </div>
                  ))
                )}
          </div>
        </div>
      </div>
    </div>
  )
}
