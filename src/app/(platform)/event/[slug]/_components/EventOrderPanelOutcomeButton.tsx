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
  function getOutcomeLabelClass(label: string) {
    if (label.length > 26) {
      return 'text-[10px]'
    }
    if (label.length > 20) {
      return 'text-[11px]'
    }
    return 'text-xs'
  }

  if (!state.event || !state.market || !state.outcome) {
    return <></>
  }

  return (
    <Button
      type="button"
      variant={isSelected ? type : 'outline'}
      size="lg"
      className={cn(
        'flex-1 items-center justify-between gap-2 px-3 py-2 text-xs leading-tight',
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
      <span
        className={cn(
          'min-w-0 flex-1 leading-tight font-semibold tracking-tight',
          getOutcomeLabelClass(
            type === 'yes'
              ? isBinaryMarket
                ? state.market.outcomes[0].outcome_text
                : 'Yes'
              : isBinaryMarket
                ? state.market.outcomes[1].outcome_text
                : 'No',
          ),
        )}
      >
        {type === 'yes'
          ? isBinaryMarket
            ? state.market.outcomes[0].outcome_text
            : 'Yes'
          : isBinaryMarket
            ? state.market.outcomes[1].outcome_text
            : 'No'}
      </span>
      <span className="shrink-0 text-sm font-bold">
        {price}
        ¢
      </span>
    </Button>
  )
}
