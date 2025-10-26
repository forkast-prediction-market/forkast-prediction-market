import { BanknoteIcon } from 'lucide-react'
import { ORDER_SIDE } from '@/lib/constants'
import { calculateWinnings } from '@/lib/mockData'
import { cn } from '@/lib/utils'
import { calculateSellAmount, getAvgSellPrice, useOrder } from '@/stores/useOrder'

interface EventOrderPanelEarningsProps {
  isMobile: boolean
}

export default function EventOrderPanelEarnings({ isMobile }: EventOrderPanelEarningsProps) {
  const state = useOrder()

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
                  ? `$${calculateSellAmount().toFixed(2)}`
                  : `$${calculateWinnings(Number.parseFloat(state.amount), 0.72).toFixed(2)}`}
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
              ? `Avg. price ${getAvgSellPrice()}¢`
              : 'Avg. Price 72¢'}
          </div>
        </div>
        {!isMobile && (
          <div className="text-4xl font-bold text-yes">
            {state.side === ORDER_SIDE.SELL
              ? `$${calculateSellAmount().toFixed(2)}`
              : `$${calculateWinnings(Number.parseFloat(state.amount), 0.26).toFixed(2)}`}
          </div>
        )}
      </div>
    </div>
  )
}
