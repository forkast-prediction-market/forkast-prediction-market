'use client'

import { MoveRightIcon } from 'lucide-react'
import Image from 'next/image'
import { formatCentsLabel, formatCurrency } from '@/lib/formatters'

interface PortfolioPositionsTableProps {
  searchQuery: string
}

interface Position {
  id: string
  market: string
  marketImage: string
  avgPrice: number
  currentPrice: number
  bet: number
  toWin: number
  value: number
  outcome: string
}

const mockPositions: Position[] = []

export default function PortfolioPositionsTable({ searchQuery }: PortfolioPositionsTableProps) {
  const filteredPositions = mockPositions.filter(position =>
    position.market.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      {/* Table container with horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Table header */}
          <div className={`
            grid grid-cols-6 gap-4 rounded-t bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground
          `}
          >
            <div>MARKET</div>
            <div className="flex items-center gap-1">
              AVG
              {' '}
              <MoveRightIcon className="size-3" />
              {' '}
              NOW
            </div>
            <div>ORDER</div>
            <div>TO WIN</div>
            <div className="flex items-center gap-1">
              VALUE
              <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <div></div>
          </div>

          {/* Separator line */}
          <div className="border-t border-border/50"></div>

          {/* Table content or empty state */}
          {filteredPositions.length === 0
            ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-2 text-muted-foreground">No positions found.</div>
                </div>
              )
            : (
                <div className="divide-y divide-border">
                  {filteredPositions.map(position => (
                    <div
                      key={position.id}
                      className="grid grid-cols-6 items-center gap-4 px-4 py-4 transition-colors hover:bg-accent"
                    >
                      {/* Market */}
                      <div className="flex items-center gap-3">
                        <Image
                          src={position.marketImage}
                          alt={position.market}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{position.market}</div>
                          <div className="text-xs text-muted-foreground">{position.outcome}</div>
                        </div>
                      </div>

                      {/* AVG → NOW */}
                      <div className="text-sm">
                        <div>
                          {formatCentsLabel(position.avgPrice)}
                          {' '}
                          →
                          {' '}
                          {formatCentsLabel(position.currentPrice)}
                        </div>
                        <div className={`text-xs ${position.currentPrice > position.avgPrice
                          ? 'text-green-600'
                          : `text-red-600`}`}
                        >
                          {position.currentPrice > position.avgPrice ? '+' : ''}
                          {((position.currentPrice - position.avgPrice) / position.avgPrice * 100).toFixed(1)}
                          %
                        </div>
                      </div>

                      {/* Bet */}
                      <div className="text-sm font-medium">
                        {formatCurrency(position.bet)}
                      </div>

                      {/* To Win */}
                      <div className="text-sm font-medium">
                        {formatCurrency(position.toWin)}
                      </div>

                      {/* Value */}
                      <div className="text-sm font-medium">
                        <div>
                          {formatCurrency(position.value)}
                        </div>
                        <div className={`text-xs ${position.value >= position.bet ? 'text-green-600' : 'text-red-600'}`}>
                          {position.value - position.bet >= 0 ? '+' : '-'}
                          {formatCurrency(Math.abs(position.value - position.bet))}
                        </div>
                      </div>

                      {/* Actions placeholder */}
                      <div></div>
                    </div>
                  ))}
                </div>
              )}
        </div>
      </div>
    </div>
  )
}
