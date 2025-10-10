'use client'

import type { Event, HoldersResponse, TopHolder } from '@/types'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { formatPosition, truncateAddress } from '@/lib/utils'

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

  useEffect(() => {
    const abortController = new AbortController()

    async function fetchHolders() {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }))

        const response = await fetch(`/api/events/${event.slug}/holders`, {
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to fetch holders data')
        }

        const data: HoldersResponse = await response.json()

        setState({
          yesHolders: data.yesHolders,
          noHolders: data.noHolders,
          loading: false,
          error: null,
        })
      }
      catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was cancelled, don't update state
          return
        }

        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load holders',
        }))
      }
    }

    fetchHolders()

    return () => {
      abortController.abort()
    }
  }, [event.slug])

  if (state.loading) {
    return (
      <div className="mt-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Yes Holders Loading */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-yes">
              Yes Holders
            </h3>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="mb-1 h-4 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* No Holders Loading */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-no">
              No Holders
            </h3>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="mb-1 h-4 w-20 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
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
      <div className="grid grid-cols-2 gap-6">
        {/* Yes Holders */}
        <div>
          <h3 className="mb-4 text-sm font-semibold text-yes">
            Yes Holders
          </h3>
          <div className="space-y-3">
            {state.yesHolders.length === 0
              ? (
                  <p className="text-sm text-muted-foreground">No holders found</p>
                )
              : (
                  state.yesHolders.map(holder => (
                    <div key={`${holder.user.id}-${holder.outcomeIndex}`} className="flex items-center gap-3">
                      {holder.user.image
                        ? (
                            <Image
                              src={holder.user.image}
                              alt={holder.user.username || holder.user.address}
                              width={32}
                              height={32}
                              className="shrink-0 rounded-full"
                            />
                          )
                        : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                              <span className="text-xs font-medium">
                                {(holder.user.username || holder.user.address).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {holder.user.username || truncateAddress(holder.user.address)}
                        </div>
                        <div className="text-xs font-semibold text-yes">
                          {formatPosition(holder.netPosition)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
          </div>
        </div>

        {/* No Holders */}
        <div>
          <h3 className="mb-4 text-sm font-semibold text-no">
            No Holders
          </h3>
          <div className="space-y-3">
            {state.noHolders.length === 0
              ? (
                  <p className="text-sm text-muted-foreground">No holders found</p>
                )
              : (
                  state.noHolders.map(holder => (
                    <div key={`${holder.user.id}-${holder.outcomeIndex}`} className="flex items-center gap-3">
                      {holder.user.image
                        ? (
                            <Image
                              src={holder.user.image}
                              alt={holder.user.username || holder.user.address}
                              width={32}
                              height={32}
                              className="shrink-0 rounded-full"
                            />
                          )
                        : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                              <span className="text-xs font-medium">
                                {(holder.user.username || holder.user.address).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {holder.user.username || truncateAddress(holder.user.address)}
                        </div>
                        <div className="text-xs font-semibold text-no">
                          {formatPosition(holder.netPosition)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
          </div>
        </div>
      </div>
    </div>
  )
}
