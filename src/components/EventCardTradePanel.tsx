import type { SelectedOutcome } from '@/types/EventCardTypes'
import { DollarSignIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MAX_AMOUNT_INPUT, sanitizeNumericInput } from '@/lib/amount-input'

interface EventCardTradePanelProps {
  activeOutcome: SelectedOutcome
  formattedTradeAmount: string
  amountNumber: number
  availableBalance: number
  isLoading: boolean
  isSingleMarket: boolean
  toWinLabel: string
  onAmountChange: (value: string) => void
  onConfirmTrade: (mouseEvent?: MouseEvent) => void
  onCancelTrade: () => void
}

export default function EventCardTradePanel({
  activeOutcome,
  formattedTradeAmount,
  amountNumber,
  availableBalance,
  isLoading,
  isSingleMarket,
  toWinLabel,
  onAmountChange,
  onConfirmTrade,
  onCancelTrade,
}: EventCardTradePanelProps) {
  function handleTradeAmountInputChange(rawValue: string) {
    const cleaned = sanitizeNumericInput(rawValue)

    if (cleaned === '') {
      onAmountChange('')
      return
    }

    const numericValue = Number.parseFloat(cleaned)
    if (Number.isNaN(numericValue)) {
      onAmountChange('')
      return
    }

    if (numericValue > MAX_AMOUNT_INPUT) {
      return
    }

    onAmountChange(cleaned)
  }

  return (
    <div className="flex-1 space-y-3">
      <div className="relative">
        <DollarSignIcon
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-yes"
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={formattedTradeAmount}
          onChange={event => handleTradeAmountInputChange(event.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && amountNumber > 0) {
              e.preventDefault()
              onConfirmTrade()
            }
            else if (e.key === 'Escape') {
              e.preventDefault()
              onCancelTrade()
            }
          }}
          className={
            `
              w-full
              [appearance:textfield]
              rounded border ${amountNumber > availableBalance ? 'border-red-500' : 'border-transparent'}
              bg-slate-100 py-2 pr-3 pl-10 text-sm text-slate-900 transition-colors
              placeholder:text-slate-500
              focus:bg-slate-200 focus:outline-none
              dark:bg-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:bg-slate-600
              [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
            `
          }
          onClick={e => e.stopPropagation()}
          autoFocus
        />
      </div>

      <Button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onConfirmTrade(e.nativeEvent)
        }}
        disabled={
          isLoading
          || amountNumber <= 0
          || amountNumber > availableBalance
        }
        size="outcome"
        variant={activeOutcome.variant}
        className="w-full"
      >
        {isLoading
          ? (
              <div className="flex items-center justify-center gap-2">
                <div
                  className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                >
                </div>
                <span>Processing...</span>
              </div>
            )
          : (
              <div className="line-clamp-3 text-center text-xs">
                <div>
                  Buy
                  {' '}
                  {activeOutcome.variant === 'yes'
                    ? activeOutcome.outcome.outcome_text
                    : (isSingleMarket ? activeOutcome.outcome.outcome_text : `Against ${activeOutcome.outcome.outcome_text}`)}
                </div>
                <div className="text-xs opacity-90">
                  to win $
                  {toWinLabel}
                </div>
              </div>
            )}
      </Button>
    </div>
  )
}
