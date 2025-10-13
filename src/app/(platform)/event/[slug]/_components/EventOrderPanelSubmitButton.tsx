import { Button } from '@/components/ui/button'
import { getUserShares, useAmountAsNumber, useOrder } from '@/stores/useOrder'

export default function EventOrderPanelSubmitButton() {
  const state = useOrder()
  const amount = useAmountAsNumber()

  return (
    <Button
      type="submit"
      className="!h-[50px] w-full"
      size="lg"
      disabled={
        state.isLoading
        || !amount
        || (state.side === 'sell' && amount > getUserShares())
      }
      onClick={e => state.setLastMouseEvent(e)}
    >
      {state.isLoading
        ? (
            <div className="flex items-center justify-center gap-2">
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              <span>Processing...</span>
            </div>
          )
        : (
            <span>Trade</span>
          )}
    </Button>
  )
}
