'use client'

import type { Event, User } from '@/types'
import { useState } from 'react'
import { Teleport } from '@/components/layout/Teleport'
import { useTradingState } from '@/hooks/useTradingState'
import EventChart from './EventChart'
import EventHeader from './EventHeader'
import EventMarketContext from './EventMarketContext'
import EventMarkets from './EventMarkets'
import EventMetaInformation from './EventMetaInformation'
import EventMobileOrderPanel from './EventMobileOrderPanel'
import EventOrderPanel from './EventOrderPanel'
import EventRelated from './EventRelated'
import EventRules from './EventRules'
import EventTabs from './EventTabs'

interface Props {
  event: Event
  user: User | null
}

export default function EventContent({ event, user }: Props) {
  const tradingState = useTradingState({ event })
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false)

  return (
    <>
      <EventHeader event={event} />
      <EventMetaInformation event={event} />
      <EventChart event={event} tradingState={tradingState} />
      <EventMarkets event={event} tradingState={tradingState} setIsMobileModalOpen={setIsMobileModalOpen} />
      <EventMarketContext event={event} tradingState={tradingState} />
      <EventRules event={event} />
      <EventTabs event={event} user={user} />

      <Teleport to="#event-order-panel">
        <EventOrderPanel event={event} tradingState={tradingState} />
        <EventRelated event={event} />
      </Teleport>

      <EventMobileOrderPanel
        event={event}
        tradingState={tradingState}
        isMobileModalOpen={isMobileModalOpen}
        setIsMobileModalOpen={setIsMobileModalOpen}
      />
    </>
  )
}
