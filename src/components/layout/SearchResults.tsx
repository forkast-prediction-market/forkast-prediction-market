import type { Event, SearchResultsProps } from '@/types'
import { LoaderIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ProfileResults } from './ProfileResults'
import { SearchTabs } from './SearchTabs'

export function SearchResults({
  results,
  isLoading,
  activeTab,
  onResultClick,
  onTabChange,
}: SearchResultsProps) {
  const { events, profiles } = results

  // Determine tab visibility
  const showEventsTab = events.length > 0 || isLoading.events
  const showProfilesTab = profiles.length > 0 || isLoading.profiles
  const showTabs = showEventsTab && showProfilesTab

  // Show loading state when both searches are loading and no results yet
  if ((isLoading.events && isLoading.profiles) && events.length === 0 && profiles.length === 0) {
    return (
      <div className="absolute top-full right-0 left-0 z-50 mt-1 w-full rounded-lg border bg-background shadow-lg">
        <div className="flex items-center justify-center p-4">
          <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
        </div>
      </div>
    )
  }

  // Hide results if no data and not loading
  if (!showEventsTab && !showProfilesTab) {
    return <></>
  }

  return (
    <div
      data-testid="search-results"
      className="absolute top-full right-0 left-0 z-50 mt-1 rounded-lg border bg-background shadow-lg"
    >
      {/* Render tabs only when both result types exist */}
      {showTabs && (
        <SearchTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          eventCount={events.length}
          profileCount={profiles.length}
          isLoading={isLoading}
        />
      )}

      {/* Content area */}
      <div className="max-h-96 overflow-y-auto">
        {/* Show events content when events tab is active or when only events have results */}
        {(activeTab === 'events' || !showProfilesTab) && showEventsTab && (
          <div id="events-panel" role="tabpanel" aria-labelledby="events-tab">
            {isLoading.events && events.length === 0
              ? (
                  <div className="flex items-center justify-center p-4">
                    <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Searching events...</span>
                  </div>
                )
              : (
                  <EventResults events={events} onResultClick={onResultClick} />
                )}
          </div>
        )}

        {/* Show profiles content when profiles tab is active or when only profiles have results */}
        {(activeTab === 'profiles' || !showEventsTab) && showProfilesTab && (
          <div id="profiles-panel" role="tabpanel" aria-labelledby="profiles-tab">
            <ProfileResults
              profiles={profiles}
              isLoading={isLoading.profiles}
              onResultClick={onResultClick}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Extract event results rendering into separate component for clarity
function EventResults({ events, onResultClick }: { events: Event[], onResultClick: () => void }) {
  if (events.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No events found
      </div>
    )
  }

  return (
    <>
      {events.map(result => (
        <Link
          key={`${result.id}-${result.slug}`}
          href={`/event/${result.slug}`}
          onClick={onResultClick}
          data-testid="search-result-item"
          className={`
            flex items-center justify-between p-3 transition-colors
            first:rounded-t-lg
            last:rounded-b-lg
            hover:bg-accent
          `}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="size-8 flex-shrink-0 overflow-hidden rounded">
              <Image
                src={result.icon_url}
                alt={result.title}
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium text-foreground">
                {result.title}
              </h3>
            </div>
          </div>

          <div className="flex flex-col items-end text-right">
            <span className="text-lg font-bold text-foreground">
              {result.markets[0].probability.toFixed(0)}
              %
            </span>
          </div>
        </Link>
      ))}
    </>
  )
}
