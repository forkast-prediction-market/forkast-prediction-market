import type { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useOrder } from '@/stores/useOrder'

interface Props {
  inputRef: RefObject<HTMLInputElement | null>
}

export default function EventOrderPanelBuySellTabs({ inputRef }: Props) {
  const state = useOrder()
  return (
    <div className="mb-4 flex text-sm font-semibold">
      <Button
        type="button"
        variant="ghost"
        className={cn({
          'border-primary text-foreground': state.activeTab === 'buy',
        }, 'flex-1 rounded-none border-b-2 pb-2 transition-colors duration-200')}
        onClick={() => {
          state.setActiveTab('buy')
          state.setAmount('') // Reset value when changing tab
          inputRef?.current?.focus()
        }}
      >
        Buy
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn({
          'border-primary text-foreground': state.activeTab === 'sell',
        }, 'flex-1 rounded-none border-b-2 pb-2 transition-colors duration-200')}
        onClick={() => {
          state.setActiveTab('sell')
          state.setAmount('') // Reset value when changing tab
          inputRef?.current?.focus()
        }}
      >
        Sell
      </Button>
    </div>
  )
}
