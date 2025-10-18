'use client'

import Image from 'next/image'

interface HistoryItem {
  id: string
  activity: 'Sold' | 'Bought' | 'Lost' | 'Claimed'
  market: string
  marketImage: string
  outcome: string
  price?: number
  shares: number
  value: number
  timestamp: string
}

const mockHistory: HistoryItem[] = [
  {
    id: '1',
    activity: 'Sold',
    market: '50% Brazil tariff in effect by August 1?',
    marketImage: 'https://avatar.vercel.sh/brazil.png',
    outcome: 'Yes 1¢',
    shares: 1,
    value: 0.01,
    timestamp: '16 days ago',
  },
  {
    id: '2',
    activity: 'Bought',
    market: '50% Brazil tariff in effect by August 1?',
    marketImage: 'https://avatar.vercel.sh/brazil.png',
    outcome: 'Yes 83¢',
    shares: 1,
    value: -1.00,
    timestamp: '19 days ago',
  },
  {
    id: '3',
    activity: 'Lost',
    market: 'Trump and Elon publicly reconcile by Friday?',
    marketImage: 'https://avatar.vercel.sh/trump.png',
    outcome: '0 shares',
    shares: 0,
    value: 0,
    timestamp: '2 mo ago',
  },
  {
    id: '4',
    activity: 'Claimed',
    market: 'Trump and Elon publicly reconcile by Friday?',
    marketImage: 'https://avatar.vercel.sh/trump.png',
    outcome: '',
    shares: 0,
    value: 1.10,
    timestamp: '2 mo ago',
  },
  {
    id: '5',
    activity: 'Bought',
    market: 'Trump and Elon publicly reconcile by Friday?',
    marketImage: 'https://avatar.vercel.sh/trump.png',
    outcome: 'No 91¢',
    shares: 1,
    value: -1.00,
    timestamp: '2 mo ago',
  },
]

function getActivityIcon(activity: string) {
  switch (activity) {
    case 'Sold':
      return (
        <div className="flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: '#6b7280' }}>
          <span className="text-xs font-bold" style={{ color: '#0f172a' }}>−</span>
        </div>
      )
    case 'Bought':
      return (
        <div className="flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: '#6b7280' }}>
          <span className="text-xs font-bold" style={{ color: '#0f172a' }}>+</span>
        </div>
      )
    case 'Lost':
      return (
        <div className="flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: '#ef4444' }}>
          <span className="text-xs font-bold" style={{ color: '#0f172a' }}>×</span>
        </div>
      )
    case 'Claimed':
      return (
        <div className="flex h-4 w-4 items-center justify-center rounded-full" style={{ backgroundColor: '#22c55e' }}>
          <span className="text-xs font-bold" style={{ color: '#0f172a' }}>✓</span>
        </div>
      )
    default:
      return null
  }
}

interface PortfolioHistoryTableProps {
  searchQuery: string
}

export default function PortfolioHistoryTable({ searchQuery }: PortfolioHistoryTableProps) {
  const filteredHistory = mockHistory.filter(item =>
    item.market.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      {/* Table container with horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Table header */}
          <div className="flex items-center rounded-t bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground">
            <div className="w-32">ACTIVITY</div>
            <div className="flex-1">MARKET</div>
            <div className="w-24 text-right">VALUE</div>
          </div>

          {/* Separator line */}
          <div className="border-t border-border/50"></div>

          {/* Table content or empty state */}
          {filteredHistory.length === 0
            ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-2 text-muted-foreground">No history found.</div>
                </div>
              )
            : (
                <div className="divide-y divide-border">
                  {filteredHistory.map(item => (
                    <div key={item.id} className="flex items-center px-4 py-4 transition-colors hover:bg-accent">
                      {/* Activity */}
                      <div className="flex w-32 items-center gap-3">
                        {getActivityIcon(item.activity)}
                        <span className="text-sm font-medium">{item.activity}</span>
                      </div>

                      {/* Market */}
                      <div className="flex flex-1 items-center gap-3">
                        <Image
                          src={item.marketImage}
                          alt={item.market}
                          width={32}
                          height={32}
                          className="flex-shrink-0 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.market}</div>
                          {item.outcome && (
                            <div className="mt-1 flex items-center gap-2">
                              {item.outcome && item.outcome !== '0 shares' && (
                                <span
                                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                                    item.outcome.includes('Yes')
                                      ? 'bg-yes/15 text-yes-foreground'
                                      : 'bg-no/15 text-no-foreground'
                                  }`}
                                >
                                  {item.outcome}
                                </span>
                              )}
                              {item.outcome === '0 shares' && (
                                <span className="text-xs text-muted-foreground">
                                  {item.outcome}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                ·
                                {' '}
                                {item.shares}
                                {' '}
                                shares
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Value and Timestamp */}
                      <div className="w-24 text-right">
                        <div
                          className={`text-sm font-medium ${
                            item.value > 0
                              ? 'text-green-600'
                              : item.value < 0
                                ? 'text-red-600'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {item.value === 0 ? '−' : (item.value > 0 ? '+' : '')}
                          {item.value !== 0 && `$${Math.abs(item.value).toFixed(2)}`}
                        </div>
                        <div className="text-sm text-muted-foreground">{item.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </div>
      </div>
    </div>
  )
}
