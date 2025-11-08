import { Button } from '@/components/ui/button'
import { formatCentsLabel } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useOrder } from '@/stores/useOrder'

interface EventOrderPanelOutcomeButtonProps {
  type: 'yes' | 'no'
  price: number
}

export default function EventOrderPanelOutcomeButton({ type, price }: EventOrderPanelOutcomeButtonProps) {
  const state = useOrder()
  const outcomeIndex = type === 'yes' ? 0 : 1
  const isSelected = state.outcome!.outcome_index === outcomeIndex

  if (!state.event || !state.market || !state.outcome) {
    return <></>
  }

  return (
    <Button
      type="button"
      variant={isSelected ? type : 'outline'}
      size="outcome"
      className={cn(
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
      <span className="truncate opacity-70">
        {type === 'yes'
          ? state.market.outcomes[0].outcome_text
          : state.market.outcomes[1].outcome_text}
      </span>
      <span className="shrink-0 text-base font-bold">
        {formatCentsLabel(price)}
      </span>
    </Button>
  )
}
