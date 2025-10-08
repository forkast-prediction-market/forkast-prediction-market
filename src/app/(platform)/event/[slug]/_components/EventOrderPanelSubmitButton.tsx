import { Button } from '@/components/ui/button'
import { getUserShares, useAmountAsNumber, useIsBinaryMarket, useOrder } from '@/stores/useOrder'

export default function EventOrderPanelSubmitButton() {
  const state = useOrder()
  const amount = useAmountAsNumber()
  const isBinaryMarket = useIsBinaryMarket()

  return (
    <Button
      type="submit"
      className="w-full"
      size="lg"
      disabled={
        state.isLoading
        || !amount
        || (state.side === 'sell' && amount > getUserShares())
      }
    >
      {state.isLoading
        ? (
            <div className="flex items-center justify-center gap-2">
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              <span>Processing...</span>
            </div>
          )
        : (
            <>
              {`${state.side === 'sell' ? 'Sell' : 'Buy'} ${
                state.outcome?.outcome_index === 1
                  ? !isBinaryMarket
                      ? 'No'
                      : state.outcome?.outcome_text
                  : !isBinaryMarket
                      ? 'Yes'
                      : state.outcome?.outcome_text
              }`}
            </>
          )}
    </Button>
  )
}
