import type { RefObject } from 'react'
import type { PortfolioUserOpenOrder } from '@/app/(platform)/portfolio/_types/PortfolioOpenOrdersTypes'
import { tableHeaderClass } from '@/lib/constants'
import { cn } from '@/lib/utils'
import PortfolioOpenOrdersRow from './PortfolioOpenOrdersRow'

interface PortfolioOpenOrdersTableProps {
  rowGridClass: string
  orders: PortfolioUserOpenOrder[]
  isLoading: boolean
  emptyText: string
  isFetchingNextPage: boolean
  loadMoreRef: RefObject<HTMLDivElement | null>
}

export default function PortfolioOpenOrdersTable({
  rowGridClass,
  orders,
  isLoading,
  emptyText,
  isFetchingNextPage,
  loadMoreRef,
}: PortfolioOpenOrdersTableProps) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-180">
        <div
          className={cn(
            rowGridClass,
            tableHeaderClass,
          )}
        >
          <div className="pl-15 text-left">Market</div>
          <div className="text-center">Side</div>
          <div className="text-left">Outcome</div>
          <div className="text-center">Price</div>
          <div className="text-center">Filled</div>
          <div className="text-center">Total</div>
          <div className="text-left sm:text-center">Expiration</div>
          <div className="flex justify-end">
            <div className="w-10" aria-hidden />
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3 px-2 sm:px-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-14 rounded-lg border bg-muted/30" />
            ))}
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        )}

        {!isLoading && orders.length > 0 && (
          <div className="space-y-0">
            {orders.map(order => (
              <PortfolioOpenOrdersRow key={order.id} order={order} rowGridClass={rowGridClass} />
            ))}
            {isFetchingNextPage && (
              <div className="py-3 text-center text-xs text-muted-foreground">Loading more...</div>
            )}
            <div ref={loadMoreRef} className="h-0" />
          </div>
        )}
      </div>
    </div>
  )
}
