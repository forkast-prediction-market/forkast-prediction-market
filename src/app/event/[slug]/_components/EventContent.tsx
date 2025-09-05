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
import { useOrder } from '@/stores/useOrder'

interface Props {
  event: Event
  user: User | null
}

export default function EventContent({ event, user }: Props) {
  const setEvent = useOrder(state => state.setEvent)
  const setMarket = useOrder(state => state.setMarket)
  const setOutcome = useOrder(state => state.setOutcome)

  useEffect(() => {
    setEvent(event)
    setMarket(event.markets[0])
    setOutcome(event.markets[0].outcomes[0])
  }, [event, setEvent, setMarket, setOutcome])

  return (
    <>
      <EventHeader event={event} />
      <EventMetaInformation event={event} />
      <EventChart event={event} />
      <EventMarkets event={event} />
      <EventMarketContext event={event} />
      <EventRules event={event} />
      <EventTabs event={event} user={user} />

      <Teleport to="#event-order-panel">
        <EventOrderPanel event={event} isMobile={false} />
        <EventRelated event={event} />
      </Teleport>

      <EventOrderPanelMobile event={event} />
    </>
  )
}
