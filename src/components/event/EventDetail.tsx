'use client'

import type { Event } from '@/types'
import { useState } from 'react'
import EventChart from '@/components/event/EventChart'
import EventHeader from '@/components/event/EventHeader'
import EventMarketContext from '@/components/event/EventMarketContext'
import EventMarkets from '@/components/event/EventMarkets'
import EventMetaInformation from '@/components/event/EventMetaInformation'
import EventMobileOrderPanel from '@/components/event/EventMobileOrderPanel'
import RelatedEvents from '@/components/event/EventRelated'
import EventRules from '@/components/event/EventRules'
import { EventTabs } from '@/components/event/EventTabs'
import OrderPanel from '@/components/event/OrderPanel'
import { useTradingState } from '@/hooks/useTradingState'

interface Props {
  event: Event
}

export default function EventDetail({ event }: Props) {
  const tradingState = useTradingState({ event })

  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false)

  return (
    <>
      <main className="container grid gap-8 pb-12 md:pb-12 lg:grid-cols-[3fr_1fr] lg:gap-10">
        <div className="pt-4 pb-20 md:pb-0">
          <EventHeader event={event} />
          <EventMetaInformation event={event} />
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
    </>
  )
}
