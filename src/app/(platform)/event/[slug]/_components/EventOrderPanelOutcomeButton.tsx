import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useOrder } from '@/stores/useOrder'

interface Props {
  type: 'yes' | 'no'
  price: number
}

export default function EventOrderPanelOutcomeButton({ type, price }: Props) {
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
      size="lg"
      className={cn(
        '!h-[50px] min-w-0 flex-1 gap-1 px-3 text-sm',
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
      <span className="shrink-0 font-bold">
        {price}
        ¢
      </span>
    </Button>
  )
}
