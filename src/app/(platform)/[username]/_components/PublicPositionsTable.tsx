import type { RefObject } from 'react'
import type { PublicPosition } from './PublicPositionItem'
import type { PositionsTotals } from '@/app/(platform)/[username]/_types/PublicPositionsTypes'
import { formatCurrencyValue } from '@/app/(platform)/[username]/_utils/PublicPositionsUtils'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import PublicPositionsError from './PublicPositionsError'
import PublicPositionsLoadingState from './PublicPositionsLoadingState'
import PublicPositionsRow from './PublicPositionsRow'

interface PublicPositionsTableProps {
  rowGridClass: string
  positions: PublicPosition[]
  totals: PositionsTotals
  isLoading: boolean
  hasInitialError: boolean
  isSearchActive: boolean
  searchQuery: string
  retryCount: number
  marketStatusFilter: 'active' | 'closed'
  onRetry: () => void
  onRefreshPage: () => void
  onShareClick: (position: PublicPosition) => void
  onSellClick?: (position: PublicPosition) => void
  loadMoreRef: RefObject<HTMLDivElement | null>
}

export default function PublicPositionsTable({
  rowGridClass,
  positions,
  totals,
  isLoading,
  hasInitialError,
  isSearchActive,
  searchQuery,
  retryCount,
  marketStatusFilter,
  onRetry,
  onRefreshPage,
  onShareClick,
  onSellClick,
  loadMoreRef,
}: PublicPositionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-180">
        <div
          className={cn(
            rowGridClass,
            'px-2 pt-2 pb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:px-3',
          )}
        >
          <div className="pl-15 text-left">Market</div>
          <div className="text-left">Avg → Now</div>
          <div className="text-center">Trade</div>
          <div className="text-center">To win</div>
          <div className="text-right">Value</div>
          <div className="flex justify-end">
            <div className="w-24" aria-hidden />
          </div>
        </div>

        {hasInitialError && (
          <PublicPositionsError
            isSearchActive={isSearchActive}
            searchQuery={searchQuery}
            retryCount={retryCount}
            isLoading={isLoading}
            onRetry={onRetry}
            onRefreshPage={onRefreshPage}
          />
        )}

        {isLoading && (
          <PublicPositionsLoadingState
            skeletonCount={5}
            isSearchActive={isSearchActive}
            searchQuery={searchQuery}
            marketStatusFilter={marketStatusFilter}
            retryCount={retryCount}
          />
        )}

        {!isLoading && positions.length === 0 && !hasInitialError && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {marketStatusFilter === 'active' ? 'No positions found.' : 'No closed positions found.'}
          </div>
        )}

        {!isLoading && positions.length > 0 && (
          <div className="space-y-0">
            {positions.map(position => (
              <PublicPositionsRow
                key={position.id}
                position={position}
                rowGridClass={rowGridClass}
                onShareClick={onShareClick}
                onSellClick={onSellClick}
              />
            ))}

            <div
              className={cn(
                rowGridClass,
                'border-b border-border/80 px-2 py-3 sm:px-3',
              )}
            >
              <div className="pl-15 text-sm font-semibold text-foreground">Total</div>
              <div className="text-sm text-muted-foreground" />
              <div className="text-center text-sm font-semibold text-foreground">
                {formatCurrencyValue(totals.trade)}
              </div>
              <div className="text-center text-sm font-semibold text-foreground">
                {formatCurrencyValue(totals.toWin)}
              </div>
              <div className="text-right text-sm font-semibold text-foreground">
                {formatCurrencyValue(totals.value)}
                <div className={cn('text-xs', totals.diff >= 0 ? 'text-yes' : 'text-no')}>
                  {`${totals.diff >= 0 ? '+' : ''}${formatCurrency(Math.abs(totals.diff))}`}
                  {' '}
                  (
                  {totals.pct.toFixed(2)}
                  %)
                </div>
              </div>
              <div className="flex justify-end">
                <div className="w-24" aria-hidden />
              </div>
            </div>
            <div ref={loadMoreRef} className="h-0" />
          </div>
        )}
      </div>
    </div>
  )
}
