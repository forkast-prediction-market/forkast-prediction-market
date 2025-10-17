'use client'

import type { Event, User } from '@/types'
import { useEffect } from 'react'
import EventChart from '@/app/(platform)/event/[slug]/_components/EventChart'
import EventHeader from '@/app/(platform)/event/[slug]/_components/EventHeader'
import EventMarketContext from '@/app/(platform)/event/[slug]/_components/EventMarketContext'
import EventMarkets from '@/app/(platform)/event/[slug]/_components/EventMarkets'
import EventMetaInformation from '@/app/(platform)/event/[slug]/_components/EventMetaInformation'
import EventOrderPanelForm from '@/app/(platform)/event/[slug]/_components/EventOrderPanelForm'
import EventOrderPanelMobile from '@/app/(platform)/event/[slug]/_components/EventOrderPanelMobile'
import EventRelated from '@/app/(platform)/event/[slug]/_components/EventRelated'
import EventRules from '@/app/(platform)/event/[slug]/_components/EventRules'
import EventTabs from '@/app/(platform)/event/[slug]/_components/EventTabs'
import { Teleport } from '@/components/Teleport'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useOrder } from '@/stores/useOrder'

interface EventContentProps {
  event: Event
  user: User | null
  marketContextEnabled: boolean
}

export default function EventContent({ event, user, marketContextEnabled }: EventContentProps) {
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
        <EventHeader event={event} />
        <EventMetaInformation event={event} />
        <EventChart event={event} />
        <EventMarkets event={event} />
        {marketContextEnabled && <EventMarketContext event={event} />}
        <EventRules event={event} />
        {isMobile && <EventRelated event={event} />}
        <EventTabs event={event} user={user} />
      </div>

      <Teleport to="#event-order-panel">
        {!isMobile && <EventOrderPanelForm event={event} isMobile={false} />}
        {!isMobile && <EventRelated event={event} />}
      </Teleport>

      {isMobile && <EventOrderPanelMobile event={event} />}
    </>
  )
}
