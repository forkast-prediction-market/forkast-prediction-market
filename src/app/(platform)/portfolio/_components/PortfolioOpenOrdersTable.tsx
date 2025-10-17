'use client'

import Image from 'next/image'

interface OpenOrder {
  id: string
  market: string
  marketImage: string
  side: 'Buy' | 'Sell'
  outcome: string
  price: number
  filled: number
  total: number
  expiration: string
}

const mockOrders: OpenOrder[] = []

interface PortfolioOpenOrdersTableProps {
  searchQuery: string
}

export default function PortfolioOpenOrdersTable({ searchQuery }: PortfolioOpenOrdersTableProps) {
  const filteredOrders = mockOrders.filter(order =>
    order.market.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      {/* Table container with horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Table header */}
          <div className={`
            grid grid-cols-7 gap-4 rounded-t bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground
          `}
          >
            <div>MARKET</div>
            <div>SIDE</div>
            <div>OUTCOME</div>
            <div>PRICE</div>
            <div>FILLED</div>
            <div>TOTAL</div>
            <div>EXPIRATION</div>
          </div>

          {/* Separator line */}
          <div className="border-t border-border/50"></div>

          {/* Table content or empty state */}
          {filteredOrders.length === 0
            ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-2 text-muted-foreground">No open orders found.</div>
                </div>
              )
            : (
                <div className="divide-y divide-border">
                  {filteredOrders.map(order => (
                    <div
                      key={order.id}
                      className="grid grid-cols-7 items-center gap-4 px-4 py-4 transition-colors hover:bg-accent"
                    >
                      {/* Market */}
                      <div className="flex items-center gap-3">
                        <Image
                          src={order.marketImage}
                          alt={order.market}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{order.market}</div>
                        </div>
                      </div>

                      {/* Side */}
                      <div className={`text-sm font-medium ${order.side === 'Buy' ? 'text-green-600' : 'text-red-600'}`}>
                        {order.side}
                      </div>

                      {/* Outcome */}
                      <div className="text-sm">{order.outcome}</div>

                      {/* Price */}
                      <div className="text-sm font-medium">
                        {order.price.toFixed(2)}
                        ¢
                      </div>

                      {/* Filled */}
                      <div className="text-sm">
                        {order.filled}
                        %
                      </div>

                      {/* Total */}
                      <div className="text-sm font-medium">
                        $
                        {order.total.toFixed(2)}
                      </div>

                      {/* Expiration */}
                      <div className="text-sm text-muted-foreground">{order.expiration}</div>
                    </div>
                  ))}
                </div>
              )}
        </div>
      </div>
    </div>
  )
}
