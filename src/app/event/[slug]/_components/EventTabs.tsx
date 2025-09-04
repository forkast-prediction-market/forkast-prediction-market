import type { Event, User } from '@/types'
import { useState } from 'react'
import EventActivity from '@/app/event/[slug]/_components/EventActivity'
import EventComments from '@/app/event/[slug]/_components/EventComments'
import EventTabSelector from '@/app/event/[slug]/_components/EventTabSelector'
import EventTopHolders from '@/app/event/[slug]/_components/EventTopHolders'

interface EventTabsProps {
  event: Event
  user: User | null
}

export default function EventTabs({ event, user }: EventTabsProps) {
  const [activeTab, setActiveTab] = useState('comments')

  return (
    <>
      <EventTabSelector activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === 'comments' && <EventComments event={event} user={user} />}
      {activeTab === 'holders' && <EventTopHolders />}
      {activeTab === 'activity' && <EventActivity />}
    </>
  )
}
