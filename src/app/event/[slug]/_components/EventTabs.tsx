import { useState } from 'react'
import EventActivity from './EventActivity'
import EventComments from './EventComments'
import EventTabSelector from './EventTabSelector'
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
