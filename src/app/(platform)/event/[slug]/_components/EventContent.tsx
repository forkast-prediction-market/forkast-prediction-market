'use client'

import type { Event, User } from '@/types'
import { useEffect, useRef } from 'react'
import EventChart from '@/app/(platform)/event/[slug]/_components/EventChart'
import EventHeader from '@/app/(platform)/event/[slug]/_components/EventHeader'
import EventMarketContext from '@/app/(platform)/event/[slug]/_components/EventMarketContext'
import EventMarketHistory from '@/app/(platform)/event/[slug]/_components/EventMarketHistory'
import EventMarketOpenOrders from '@/app/(platform)/event/[slug]/_components/EventMarketOpenOrders'
import EventMarketPositions from '@/app/(platform)/event/[slug]/_components/EventMarketPositions'
import EventMarkets from '@/app/(platform)/event/[slug]/_components/EventMarkets'
import EventMetaInformation from '@/app/(platform)/event/[slug]/_components/EventMetaInformation'
import EventOrderPanelForm from '@/app/(platform)/event/[slug]/_components/EventOrderPanelForm'
import EventOrderPanelMobile from '@/app/(platform)/event/[slug]/_components/EventOrderPanelMobile'
import { EventOutcomeChanceProvider } from '@/app/(platform)/event/[slug]/_components/EventOutcomeChanceProvider'
import EventRelated from '@/app/(platform)/event/[slug]/_components/EventRelated'
import EventRules from '@/app/(platform)/event/[slug]/_components/EventRules'
import EventSingleMarketOrderBook from '@/app/(platform)/event/[slug]/_components/EventSingleMarketOrderBook'
import EventTabs from '@/app/(platform)/event/[slug]/_components/EventTabs'
import { Teleport } from '@/components/Teleport'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useOrder } from '@/stores/useOrder'
import { useUser } from '@/stores/useUser'

interface EventContentProps {
  event: Event
  user: User | null
  marketContextEnabled: boolean
}

export default function EventContent({ event, user, marketContextEnabled }: EventContentProps) {
  const setEvent = useOrder(state => state.setEvent)
  const setMarket = useOrder(state => state.setMarket)
  const setOutcome = useOrder(state => state.setOutcome)
  const currentEventId = useOrder(state => state.event?.id)
  const isMobile = useIsMobile()
  const clientUser = useUser()
  const prevUserId = useRef<string | null>(null)
  const currentUser = clientUser ?? user

  useEffect(() => {
    if (user?.id) {
      prevUserId.current = user.id
      useUser.setState(user)
      return
    }

    if (!user && prevUserId.current) {
      prevUserId.current = null
      useUser.setState(null)
    }
  }, [user])

  useEffect(() => {
    setEvent(event)
  }, [event, setEvent])

  useEffect(() => {
    if (currentEventId === event.id) {
      return
    }

    const defaultMarket = event.markets[0]
    if (!defaultMarket) {
      return
    }

    setMarket(defaultMarket)
    const defaultOutcome = defaultMarket.outcomes[0]
    if (defaultOutcome) {
      setOutcome(defaultOutcome)
    }
  }, [currentEventId, event, setMarket, setOutcome])

  return (
    <EventOutcomeChanceProvider eventId={event.id}>
      <div className="grid gap-3">
        <EventHeader event={event} />
        <EventMetaInformation event={event} />
        <EventChart event={event} isMobile={isMobile} />
        <EventMarkets event={event} isMobile={isMobile} />
        {event.total_markets_count === 1 && (
          <>
            { currentUser && <EventMarketPositions market={event.markets[0]} /> }
            <EventSingleMarketOrderBook market={event.markets[0]} />
            { currentUser && <EventMarketOpenOrders market={event.markets[0]} eventSlug={event.slug} />}
            { currentUser && <EventMarketHistory market={event.markets[0]} /> }
          </>
        )}
        {marketContextEnabled && <EventMarketContext event={event} />}
        <EventRules event={event} />
        {isMobile && <EventRelated event={event} />}
        <EventTabs event={event} user={currentUser} />
      </div>

      {isMobile
        ? <EventOrderPanelMobile event={event} />
        : (
            <Teleport to="#event-order-panel">
              <EventOrderPanelForm event={event} isMobile={false} />
              <EventRelated event={event} />
            </Teleport>
          )}
    </EventOutcomeChanceProvider>
  )
}
