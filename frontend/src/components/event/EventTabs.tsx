'use client'

import { useState } from 'react'
import EventActivity from '@/components/event/EventActivity'
import EventTabSelector from '@/components/event/EventTabSelector'
import EventComments from './EventComments'
import EventTopHolders from './EventTopHolders'

export function EventTabs() {
  const [activeTab, setActiveTab] = useState('comments')

  return (
    <>
      <EventTabSelector activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === 'comments' && <EventComments />}
      {activeTab === 'holders' && <EventTopHolders />}
      {activeTab === 'activity' && <EventActivity />}
    </>
  )
}
