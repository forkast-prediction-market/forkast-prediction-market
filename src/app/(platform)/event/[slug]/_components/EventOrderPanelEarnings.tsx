import type { OrderSide } from '@/types'
import { BanknoteIcon } from 'lucide-react'
import { ORDER_SIDE } from '@/lib/constants'
import { formatCurrency } from '@/lib/formatters'
import { calculateWinnings, cn } from '@/lib/utils'

interface EventOrderPanelEarningsProps {
  isMobile: boolean
  side: OrderSide
  amountNumber: number
  sellAmountLabel: string
  avgSellPriceLabel: string
  avgBuyPriceLabel: string
}

export default function EventOrderPanelEarnings({
  isMobile,
  side,
  amountNumber,
  sellAmountLabel,
  avgSellPriceLabel,
  avgBuyPriceLabel,
}: EventOrderPanelEarningsProps) {
  const buyWinningsSample = formatCurrency(calculateWinnings(amountNumber, 0.72))
  const buyWinningsDesktop = formatCurrency(calculateWinnings(amountNumber, 0.26))

  return (
    <div className={`${isMobile ? 'mb-4 text-center' : 'mb-4'}`}>
      {!isMobile && <hr className="mb-3 border" />}
      <div className={cn('flex', isMobile ? 'flex-col' : 'items-center justify-between')}>
        <div className={isMobile ? 'mb-1' : ''}>
          <div
            className={cn(
              'flex items-center gap-1 font-bold',
              isMobile ? 'justify-center text-lg text-foreground' : 'text-sm text-muted-foreground',
            )}
          >
            {side === ORDER_SIDE.SELL ? 'You\'ll receive' : 'To win'}
            {!isMobile && <BanknoteIcon className="size-4 text-yes" />}
            {isMobile && <span className="text-xl text-yes">💰</span>}
            {isMobile && (
              <span className="text-2xl font-bold text-yes">
                {side === ORDER_SIDE.SELL
                  ? sellAmountLabel
                  : buyWinningsSample}
              </span>
            )}
          </div>
          <div
            className={cn(
              'text-muted-foreground',
              isMobile ? 'text-center text-sm' : 'text-xs',
            )}
          >
            {side === ORDER_SIDE.SELL
              ? `Avg. price ${avgSellPriceLabel}`
              : `Avg. price ${avgBuyPriceLabel}`}
          </div>
        </div>
        {!isMobile && (
          <div className="text-4xl font-bold text-yes">
            {side === ORDER_SIDE.SELL
              ? sellAmountLabel
              : buyWinningsDesktop}
          </div>
        )}
      </div>
    </div>
  )
}
