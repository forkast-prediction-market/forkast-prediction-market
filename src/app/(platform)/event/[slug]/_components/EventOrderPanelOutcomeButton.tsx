import { Button } from '@/components/ui/button'
import { formatCentsLabel } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface EventOrderPanelOutcomeButtonProps {
  variant: 'yes' | 'no'
  price: number
  label: string
  isSelected: boolean
  onSelect: () => void
}

export default function EventOrderPanelOutcomeButton({
  variant,
  price,
  label,
  isSelected,
  onSelect,
}: EventOrderPanelOutcomeButtonProps) {
  return (
    <Button
      type="button"
      variant={isSelected ? variant : 'outline'}
      size="outcome"
      className={cn(
        isSelected
        && (variant === 'yes'
          ? 'bg-yes text-white hover:bg-yes-foreground'
          : 'bg-no text-white hover:bg-no-foreground'),
      )}
      onClick={onSelect}
    >
      <span className="truncate opacity-70">
        {label}
      </span>
      <span className="shrink-0 text-base font-bold">
        {formatCentsLabel(price)}
      </span>
    </Button>
  )
}
