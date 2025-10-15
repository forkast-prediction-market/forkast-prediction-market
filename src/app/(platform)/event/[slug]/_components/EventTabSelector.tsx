import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  activeTab: string
  setActiveTab: (activeTab: string) => void
}

export default function EventTabSelector({ activeTab, setActiveTab }: Props) {
  const eventTabs = useMemo(() => ['comments', 'holders', 'activity'], [])
  const tabRefs = useRef<(HTMLLIElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const [isInitialized, setIsInitialized] = useState(false)

  useLayoutEffect(() => {
    const activeTabIndex = eventTabs.indexOf(activeTab)
    const activeTabElement = tabRefs.current[activeTabIndex]

    if (activeTabElement) {
      const { offsetLeft, offsetWidth } = activeTabElement

      queueMicrotask(() => {
        setIndicatorStyle(prev => ({
          ...prev,
          left: offsetLeft,
          width: offsetWidth,
        }))

        setIsInitialized(prev => prev || true)
      })
    }
  }, [activeTab, eventTabs])

  return (
    <ul className="relative mt-3 flex h-8 gap-8 border-b text-sm font-semibold">
      {eventTabs.map((tab, index) => (
        <li
          key={tab}
          ref={(el) => {
            tabRefs.current[index] = el
          }}
          className={cn(
            'cursor-pointer transition-colors duration-200',
            activeTab === tab
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setActiveTab(tab)}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </li>
      ))}

      <div
        className={cn(
          'absolute bottom-0 h-0.5 bg-primary',
          isInitialized && 'transition-all duration-300 ease-out',
        )}
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
        }}
      />
    </ul>
  )
}
