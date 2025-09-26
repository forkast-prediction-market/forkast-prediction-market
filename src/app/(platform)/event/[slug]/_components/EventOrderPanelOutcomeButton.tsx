import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useIsBinaryMarket, useOrder } from '@/stores/useOrder'

interface Props {
  type: 'yes' | 'no'
  price: number
}

export default function EventOrderPanelOutcomeButton({ type, price }: Props) {
  const state = useOrder()
  const isBinaryMarket = useIsBinaryMarket()
  const outcomeIndex = type === 'yes' ? 0 : 1
  const isSelected = state.outcome!.outcome_index === outcomeIndex

  if (!state.event || !state.market || !state.outcome) {
    return <></>
  }

  return (
    <Button
      type="button"
      variant={isSelected ? type : 'outline'}
      size="lg"
      className={cn(
        'flex-1',
        isSelected
        && (type === 'yes'
          ? 'bg-yes text-white hover:bg-yes-foreground'
          : 'bg-no text-white hover:bg-no-foreground'),
      )}
      onClick={() => {
        state.setOutcome(state.market!.outcomes[outcomeIndex])
        state.inputRef?.current?.focus()
      }}
    >
      <span className="opacity-70">
        {type === 'yes'
          ? isBinaryMarket
            ? state.market.outcomes[0].outcome_text
            : 'Yes'
          : isBinaryMarket
            ? state.market.outcomes[1].outcome_text
            : 'No'}
      </span>
      <span className="font-bold">
        {price}
        ¢
      </span>
    </Button>
  )
}
