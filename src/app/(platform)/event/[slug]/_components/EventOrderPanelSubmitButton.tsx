import type { MouseEvent } from 'react'
import { Button } from '@/components/ui/button'

interface EventOrderPanelSubmitButtonProps {
  isLoading: boolean
  isDisabled: boolean
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}

export default function EventOrderPanelSubmitButton({ isLoading, isDisabled, onClick }: EventOrderPanelSubmitButtonProps) {
  return (
    <Button
      type="submit"
      size="outcome"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      onClick={onClick}
      className="w-full text-base font-bold"
    >
      {isLoading
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
