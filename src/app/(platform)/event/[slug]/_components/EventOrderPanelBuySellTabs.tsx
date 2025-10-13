import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useOrder } from '@/stores/useOrder'

export default function EventOrderPanelBuySellTabs() {
  const state = useOrder()

  return (
    <div className="mb-4 flex text-sm font-semibold">
      <Button
        type="button"
        variant="ghost"
        className={cn({
          'border-primary text-foreground': state.side === 'buy',
        }, 'flex-1 rounded-none border-b-2 pb-2 transition-colors duration-200')}
        onClick={() => {
          state.setSide('buy')
          state.setAmount('')
          state.inputRef?.current?.focus()
        }}
      >
        Buy
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn({
          'border-primary text-foreground': state.side === 'sell',
        }, 'flex-1 rounded-none border-b-2 pb-2 transition-colors duration-200')}
        onClick={() => {
          state.setSide('sell')
          state.setAmount('')
          state.inputRef?.current?.focus()
        }}
      >
        Sell
      </Button>
    </div>
  )
}
