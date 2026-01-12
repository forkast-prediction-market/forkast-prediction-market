import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface EventTabSelectorProps {
  activeTab: string
  setActiveTab: (activeTab: string) => void
  commentsCount: number | null
  liveCommentsStatus: 'connecting' | 'live' | 'offline'
}

export default function EventTabSelector({
  activeTab,
  setActiveTab,
  commentsCount,
  liveCommentsStatus,
}: EventTabSelectorProps) {
  const formattedCommentsCount = useMemo(
    () => (commentsCount == null ? null : Number(commentsCount).toLocaleString('en-US')),
    [commentsCount],
  )
  const commentsLabel = useMemo(() => (
    formattedCommentsCount == null ? 'Comments' : `Comments (${formattedCommentsCount})`
  ), [formattedCommentsCount])

  const eventTabs = useMemo(() => ([
    {
      key: 'comments',
      label: (
        <span className="inline-flex items-center gap-2">
          <span>{commentsLabel}</span>
          <Tooltip>
            <TooltipTrigger className="inline-flex">
              <span className="relative flex size-2">
                {liveCommentsStatus === 'live' && (
                  <span className="absolute inline-flex size-2 animate-ping rounded-full bg-yes opacity-75" />
                )}
                <span
                  className={cn(
                    'relative inline-flex size-2 rounded-full',
                    liveCommentsStatus === 'live' && 'bg-yes',
                    liveCommentsStatus === 'connecting' && 'bg-amber-500',
                    liveCommentsStatus === 'offline' && 'bg-muted-foreground/40',
                  )}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent collisionPadding={8}>
              {`Live comments status: ${liveCommentsStatus}`}
            </TooltipContent>
          </Tooltip>
        </span>
      ),
    },
    { key: 'holders', label: 'Top Holders' },
    { key: 'activity', label: 'Activity' },
  ]), [commentsLabel, liveCommentsStatus])
  const tabRefs = useRef<(HTMLLIElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const [isInitialized, setIsInitialized] = useState(false)

  useLayoutEffect(() => {
    const activeTabIndex = eventTabs.findIndex(tab => tab.key === activeTab)
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
          key={tab.key}
          ref={(el) => {
            tabRefs.current[index] = el
          }}
          className={cn(
            'cursor-pointer transition-colors duration-200',
            activeTab === tab.key
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setActiveTab(tab.key)}
        >
          {tab.label}
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
