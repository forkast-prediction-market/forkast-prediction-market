'use client'

import type { SearchTabsProps } from '@/types'
import { LoaderIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SearchTabs({
  activeTab,
  onTabChange,
  eventCount,
  profileCount,
  isLoading,
}: SearchTabsProps) {
  function handleKeyDown(event: React.KeyboardEvent, tab: 'events' | 'profiles') {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onTabChange(tab)
    }
  }

  return (
    <div className="border-b bg-background">
      <div className="flex">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTabChange('events')}
          onKeyDown={e => handleKeyDown(e, 'events')}
          className={cn(
            'h-10 rounded-none border-b-2 px-4 transition-colors',
            activeTab === 'events'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
          role="tab"
          aria-selected={activeTab === 'events'}
          aria-controls="events-panel"
          tabIndex={activeTab === 'events' ? 0 : -1}
        >
          <span>Events</span>
          {isLoading.events
            ? (
                <LoaderIcon className="ml-1 size-3 animate-spin" />
              )
            : (
                <span className="ml-1 text-xs text-muted-foreground">
                  (
                  {eventCount}
                  )
                </span>
              )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTabChange('profiles')}
          onKeyDown={e => handleKeyDown(e, 'profiles')}
          className={cn(
            'h-10 rounded-none border-b-2 px-4 transition-colors',
            activeTab === 'profiles'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
          role="tab"
          aria-selected={activeTab === 'profiles'}
          aria-controls="profiles-panel"
          tabIndex={activeTab === 'profiles' ? 0 : -1}
        >
          <span>Profiles</span>
          {isLoading.profiles
            ? <LoaderIcon className="ml-1 size-3 animate-spin" />
            : (
                <span className="ml-1 text-xs text-muted-foreground">
                  (
                  {profileCount}
                  )
                </span>
              )}
        </Button>
      </div>
    </div>
  )
}
