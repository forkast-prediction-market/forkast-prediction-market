import Image from 'next/image'
import { useState } from 'react'
import { mockMarketDetails } from '@/lib/mockData'

export default function EventActivity() {
  const [activityFilter, setActivityFilter] = useState('All')

  return (
    <div className="mt-6">
      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {mockMarketDetails.activityFilters.map(filter => (
          <button
            type="button"
            key={filter}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activityFilter === filter
                ? 'bg-muted text-foreground'
                : 'border hover:bg-muted/50'
            }`}
            onClick={() => setActivityFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* List of Activities */}
      <div className="space-y-4">
        {mockMarketDetails.activities.map(activity => (
          <div
            key={activity.time}
            className="flex items-center gap-3 border-b border-border/30 py-2 last:border-b-0"
          >
            <Image
              src={activity.avatar}
              alt={activity.user}
              width={32}
              height={32}
              className="shrink-0 rounded-full"
            />
            <div className="flex-1">
              <span className="text-sm font-medium">
                {activity.user}
              </span>
              <span className="text-sm text-muted-foreground">
                {' '}
                {activity.action}
                {' '}
              </span>
              <span className="text-sm font-semibold">
                {activity.amount}
              </span>
              <span
                className={`ml-1 text-sm font-semibold ${
                  activity.type === 'Yes'
                    ? 'text-yes'
                    : 'text-no'
                }`}
              >
                {activity.type}
              </span>
              <span className="text-sm text-muted-foreground">
                {' '}
                for
                {' '}
                {activity.market}
                {' '}
                at
                {' '}
              </span>
              <span className="text-sm font-semibold">
                {activity.price}
              </span>
              <span className="text-sm text-muted-foreground">
                {' '}
                (
                {activity.total}
                )
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {activity.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
