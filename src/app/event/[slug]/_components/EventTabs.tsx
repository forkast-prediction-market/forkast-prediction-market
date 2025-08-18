import { useState } from 'react'
import EventActivity from '@/app/event/[slug]/_components/EventActivity'
import EventTabSelector from '@/app/event/[slug]/_components/EventTabSelector'
import EventComments from './EventComments'
import EventTopHolders from './EventTopHolders'

export default function EventTabs() {
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
