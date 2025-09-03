import { mockMarketDetails } from '@/lib/mockData'

interface Props {
  activeTab: string
  setActiveTab: (activeTab: string) => void
}

export default function EventTabSelector({ activeTab, setActiveTab }: Props) {
  const { eventTabs } = mockMarketDetails

  return (
    <ul className="mt-8 flex h-12 gap-8 border-b text-sm font-semibold">
      {eventTabs.map(tab => (
        <li
          key={tab}
          className={`cursor-pointer transition-colors duration-200 ${
            activeTab === tab
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab(tab)}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </li>
      ))}
    </ul>
  )
}
