'use client'

import type { Event, User } from '@/types'
import { useEffect } from 'react'
import EventChart from '@/app/event/[slug]/_components/EventChart'
import EventHeader from '@/app/event/[slug]/_components/EventHeader'
import EventMarketContext from '@/app/event/[slug]/_components/EventMarketContext'
import EventMarkets from '@/app/event/[slug]/_components/EventMarkets'
import EventMetaInformation from '@/app/event/[slug]/_components/EventMetaInformation'
import EventOrderPanel from '@/app/event/[slug]/_components/EventOrderPanel'
import EventOrderPanelMobile from '@/app/event/[slug]/_components/EventOrderPanelMobile'
import EventRelated from '@/app/event/[slug]/_components/EventRelated'
import EventRules from '@/app/event/[slug]/_components/EventRules'
import EventTabs from '@/app/event/[slug]/_components/EventTabs'
import { Teleport } from '@/components/layout/Teleport'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useOrder } from '@/stores/useOrder'

interface EventContentProps {
  event: Event
  user: User | null
}

export default function EventContent({ event, user }: EventContentProps) {
  const setEvent = useOrder(state => state.setEvent)
  const setMarket = useOrder(state => state.setMarket)
  const setOutcome = useOrder(state => state.setOutcome)
  const isMobile = useIsMobile()

  useEffect(() => {
    setEvent(event)
    setMarket(event.markets[0])
    setOutcome(event.markets[0].outcomes[0])
  }, [event, setEvent, setMarket, setOutcome])

  return (
    <>
      <div className="grid gap-3">
        <EventMetaInformation event={event} />
        <EventHeader event={event} />
        <EventChart event={event} />
        <EventMarkets event={event} />
        <EventMarketContext event={event} />
        <EventRules event={event} />
        {isMobile && <EventRelated event={event} />}
        <EventTabs event={event} user={user} />
      </div>

      <Teleport to="#event-order-panel">
        {!isMobile && <EventOrderPanel event={event} isMobile={false} />}
        {!isMobile && <EventRelated event={event} />}
      </Teleport>

      {isMobile && <EventOrderPanelMobile event={event} />}
    </>
  )
}
