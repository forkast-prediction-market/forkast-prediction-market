import { BanknoteIcon } from 'lucide-react'
import { ORDER_SIDE } from '@/lib/constants'
import { formatCentsLabel, formatCurrency } from '@/lib/formatters'
import { calculateWinnings, cn } from '@/lib/utils'
import { calculateSellAmount, getAvgSellPrice, useOrder } from '@/stores/useOrder'

interface EventOrderPanelEarningsProps {
  isMobile: boolean
}

export default function EventOrderPanelEarnings({ isMobile }: EventOrderPanelEarningsProps) {
  const state = useOrder()
  const sellAmount = calculateSellAmount()
  const sellAmountLabel = formatCurrency(sellAmount)
  const amountNumber = Number.parseFloat(state.amount || '0') || 0
  const buyWinningsSample = formatCurrency(calculateWinnings(amountNumber, 0.72))
  const buyWinningsDesktop = formatCurrency(calculateWinnings(amountNumber, 0.26))
  const avgSellPriceLabel = formatCentsLabel(getAvgSellPrice(), { fallback: '—' })
  const avgBuyPriceLabel = formatCentsLabel(state.outcome?.buy_price, { fallback: '—' })

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
            {state.side === ORDER_SIDE.SELL ? 'You\'ll receive' : 'To win'}
            {!isMobile && <BanknoteIcon className="size-4 text-yes" />}
            {isMobile && <span className="text-xl text-yes">💰</span>}
            {isMobile && (
              <span className="text-2xl font-bold text-yes">
                {state.side === ORDER_SIDE.SELL
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
            {state.side === ORDER_SIDE.SELL
              ? `Avg. price ${avgSellPriceLabel}`
              : `Avg. price ${avgBuyPriceLabel}`}
          </div>
        </div>
        {!isMobile && (
          <div className="text-4xl font-bold text-yes">
            {state.side === ORDER_SIDE.SELL
              ? sellAmountLabel
              : buyWinningsDesktop}
          </div>
        )}
      </div>
    </div>
  )
}
