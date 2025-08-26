import type { Event } from '@/types'
import { useState } from 'react'
import EventActivity from './EventActivity'
import EventComments from './EventComments'
import EventTabSelector from './EventTabSelector'
import EventTopHolders from './EventTopHolders'

interface EventTabsProps {
  event: Event
}

export default function EventTabs({ event }: EventTabsProps) {
  const [activeTab, setActiveTab] = useState('comments')

  return (
    <>
      <EventTabSelector activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === 'comments' && <EventComments eventSlug={event.slug} />}
      {activeTab === 'holders' && <EventTopHolders />}
      {activeTab === 'activity' && <EventActivity />}
    </>
  )
}
