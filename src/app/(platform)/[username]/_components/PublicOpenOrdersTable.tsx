import type { RefObject } from 'react'
import type { PublicUserOpenOrder } from '@/app/(platform)/[username]/_types/PublicOpenOrdersTypes'
import { cn } from '@/lib/utils'
import PublicOpenOrdersRow from './PublicOpenOrdersRow'

interface PublicOpenOrdersTableProps {
  rowGridClass: string
  orders: PublicUserOpenOrder[]
  isLoading: boolean
  emptyText: string
  isFetchingNextPage: boolean
  loadMoreRef: RefObject<HTMLDivElement | null>
}

export default function PublicOpenOrdersTable({
  rowGridClass,
  orders,
  isLoading,
  emptyText,
  isFetchingNextPage,
  loadMoreRef,
}: PublicOpenOrdersTableProps) {
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
              <div key={idx} className="h-14 rounded-lg border border-border/50 bg-muted/30" />
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
              <PublicOpenOrdersRow key={order.id} order={order} rowGridClass={rowGridClass} />
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
