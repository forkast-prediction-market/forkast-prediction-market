'use client'

import type { Event } from '@/types'
import Image from 'next/image'
import { useLayoutEffect, useState } from 'react'
import EventChart from '@/components/event/EventChart'
import EventFavorite from '@/components/event/EventFavorite'
import EventMarketContext from '@/components/event/EventMarketContext'
import EventMarkets from '@/components/event/EventMarkets'
import EventMobileOrderPanel from '@/components/event/EventMobileOrderPanel'
import RelatedEvents from '@/components/event/EventRelated'
import EventRules from '@/components/event/EventRules'
import EventShare from '@/components/event/EventShare'
import { EventTabs } from '@/components/event/EventTabs'
import OrderPanel from '@/components/event/OrderPanel'
import { useTradingState } from '@/hooks/useTradingState'
import { formatDate, formatVolume } from '@/lib/mockData'

interface Props {
  event: Event
}

export default function EventDetail({ event }: Props) {
  const tradingState = useTradingState({ event })

  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false)

  // Utility functions - now using trading state
  const getYesOutcome = tradingState.getYesOutcome

  // Auto-select outcome for all markets (binary and multi-outcome)
  useLayoutEffect(() => {
    if (
      !tradingState.selectedOutcomeForOrder
      && event.active_markets_count > 0
    ) {
      if (event.active_markets_count === 1) {
        // For binary markets, select the "Yes" option (isYes = true)
        const yesOutcome = getYesOutcome()
        if (yesOutcome) {
          tradingState.setSelectedOutcomeForOrder(yesOutcome.id)
          tradingState.setYesNoSelection('yes')
        }
        else {
          // If isYes not found, select first option
          tradingState.setSelectedOutcomeForOrder(event.outcomes[0].id)
          tradingState.setYesNoSelection('yes')
        }
      }
      else if (event.active_markets_count > 1) {
        // For multi-option markets, select option with highest probability
        const sortedOutcomes = [...event.outcomes].sort(
          (a, b) => b.probability - a.probability,
        )
        const highestProbOutcome = sortedOutcomes[0]
        if (highestProbOutcome) {
          tradingState.setSelectedOutcomeForOrder(highestProbOutcome.id)
          tradingState.setYesNoSelection('yes')
        }
      }
    }
  }, [
    event.active_markets_count,
    event.outcomes,
    tradingState.selectedOutcomeForOrder,
    getYesOutcome,
    tradingState,
  ])

  return (
    <div>
      <main className="container grid gap-8 pt-8 pb-12 md:pb-12 lg:grid-cols-[3fr_1fr] lg:gap-10">
        {/* Left column - Main content */}
        <div className="pb-20 md:pb-0">
          {/* Add padding bottom on mobile for the floating button */}
          {/* Market header */}
          <div className="mb-6 flex items-center gap-4">
            <Image
              src={
                event.creatorAvatar
                || `https://avatar.vercel.sh/${event.title.charAt(0)}.png`
              }
              alt={event.creator || 'Market creator'}
              width={64}
              height={64}
              className="flex-shrink-0 rounded-xl"
            />
            <h1 className="line-clamp-3 flex-1 text-lg leading-tight font-bold md:text-xl lg:text-2xl">
              {event.title}
            </h1>
            <div className="flex gap-2 text-muted-foreground">
              <EventFavorite event={event} />
              <EventShare />
            </div>
          </div>

          {/* Meta information */}
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <span>
              Volume
              {formatVolume(event.volume)}
            </span>
            <span>•</span>
            <span>
              Expires
              {formatDate(event.endDate)}
            </span>
            <span>•</span>
            <span>{event.category}</span>
          </div>

          <EventChart event={event} tradingState={tradingState} />
          <EventMarkets event={event} tradingState={tradingState} setIsMobileModalOpen={setIsMobileModalOpen} />
          <EventMarketContext event={event} tradingState={tradingState} />
          <EventRules event={event} />
          <EventTabs />
        </div>

        <div className="hidden gap-4 md:block lg:sticky lg:top-28 lg:grid lg:self-start">
          <OrderPanel event={event} tradingState={tradingState} />
          <RelatedEvents event={event} />
        </div>
      </main>

      <EventMobileOrderPanel
        event={event}
        tradingState={tradingState}
        isMobileModalOpen={isMobileModalOpen}
        setIsMobileModalOpen={setIsMobileModalOpen}
      />
    </div>
  )
}
