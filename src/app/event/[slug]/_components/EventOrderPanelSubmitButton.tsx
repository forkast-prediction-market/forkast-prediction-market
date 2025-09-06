import { Button } from '@/components/ui/button'
import { getUserShares, useIsBinaryMarket, useOrder } from '@/stores/useOrder'

interface EventOrderPanelSubmitButtonProps {
  handleConfirmTrade: () => Promise<void>
}

export default function EventOrderPanelSubmitButton({ handleConfirmTrade }: EventOrderPanelSubmitButtonProps) {
  const state = useOrder()
  const isBinaryMarket = useIsBinaryMarket()

  return (
    <Button
      className="w-full"
      size="lg"
      onClick={handleConfirmTrade}
      disabled={
        state.isLoading
        || !state.amount
        || !state.outcome
        || (state.activeTab === 'sell' && Number.parseFloat(state.amount) > getUserShares())
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
              {`${state.activeTab === 'sell' ? 'Sell' : 'Buy'} ${
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
