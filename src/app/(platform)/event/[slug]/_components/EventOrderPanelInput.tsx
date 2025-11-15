import type { RefObject } from 'react'
import type { OrderSide } from '@/types'
import { ORDER_SIDE } from '@/lib/constants'
import { formatAmountInputValue } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface BalanceSummary {
  raw: number
  text: string
  symbol?: string
}

interface EventOrderPanelInputProps {
  isMobile: boolean
  side: OrderSide
  amount: string
  amountNumber: number
  availableShares: number
  balance: BalanceSummary
  inputRef: RefObject<HTMLInputElement | null>
  onAmountChange: (value: string) => void
}

const BUY_CHIPS_DESKTOP = ['+$5', '+$25', '+$100']
const BUY_CHIPS_MOBILE = ['+$1', '+$20', '+$100']
const INTEGER_FORMATTER = new Intl.NumberFormat('en-US')

export default function EventOrderPanelInput({
  isMobile,
  side,
  amount,
  amountNumber,
  availableShares,
  balance,
  inputRef,
  onAmountChange,
}: EventOrderPanelInputProps) {
  function focusInput() {
    inputRef?.current?.focus()
  }

  function sanitizeNumericInput(rawValue: string) {
    const digitsAndDots = rawValue.replace(/[^0-9.]/g, '')
    const [wholePart, ...decimalSegments] = digitsAndDots.split('.')
    if (decimalSegments.length === 0) {
      return wholePart
    }

    const decimals = decimalSegments.join('')
    return `${wholePart}.${decimals}`
  }

  function formatDisplayAmount(rawAmount: string) {
    if (!rawAmount) {
      return ''
    }

    const hasDecimalPoint = rawAmount.includes('.')
    const [wholePart = '', fractionPart = ''] = rawAmount.split('.')
    const normalizedWhole = Number.parseInt(wholePart || '0', 10)
    const formattedWhole = Number.isNaN(normalizedWhole)
      ? '0'
      : INTEGER_FORMATTER.format(normalizedWhole)

    if (!hasDecimalPoint) {
      return formattedWhole
    }

    if (rawAmount.endsWith('.') && fractionPart === '') {
      return `${formattedWhole}.`
    }

    return `${formattedWhole}.${fractionPart}`
  }

  function handleInputChange(rawValue: string) {
    const cleaned = sanitizeNumericInput(rawValue)

    if (side === ORDER_SIDE.SELL) {
      if (cleaned === '') {
        onAmountChange('')
        return
      }

      const nextValue = Number.parseFloat(cleaned)
      if (Number.isNaN(nextValue)) {
        onAmountChange('')
        return
      }

      if (nextValue <= availableShares) {
        onAmountChange(cleaned)
      }
      return
    }

    const numericValue = Number.parseFloat(cleaned)

    if (cleaned === '' || numericValue <= 99999) {
      onAmountChange(cleaned)
    }
  }

  function handleBlur(value: string) {
    const cleaned = sanitizeNumericInput(value)
    const numeric = Number.parseFloat(cleaned)

    if (!cleaned || Number.isNaN(numeric)) {
      onAmountChange('')
      return
    }

    const clampedValue = side === ORDER_SIDE.SELL
      ? Math.min(numeric, availableShares)
      : numeric

    onAmountChange(formatAmountInputValue(clampedValue))
  }

  function incrementAmount(delta: number) {
    const nextValue = amountNumber + delta

    if (side === ORDER_SIDE.SELL) {
      if (nextValue <= availableShares) {
        onAmountChange(formatAmountInputValue(nextValue))
      }
      return
    }

    if (nextValue <= 99999) {
      onAmountChange(formatAmountInputValue(nextValue))
    }
  }

  function decrementAmount(delta: number) {
    const nextValue = Math.max(0, amountNumber - delta)
    onAmountChange(formatAmountInputValue(nextValue))
  }

  function renderActionButtons() {
    const baseClasses = 'h-7 px-3 rounded-lg border text-[11px] transition-all duration-200 ease-in-out'

    if (side === ORDER_SIDE.SELL) {
      const isDisabled = availableShares <= 0
      return ['25%', '50%', '75%'].map(percentage => (
        <button
          type="button"
          key={percentage}
          className={`${baseClasses} ${
            isDisabled
              ? 'cursor-not-allowed opacity-50'
              : 'hover:bg-white/10 dark:hover:bg-white/5'
          }`}
          disabled={isDisabled}
          onClick={() => {
            if (isDisabled) {
              return
            }

            const percentValue = Number.parseInt(percentage.replace('%', ''), 10) / 100
            const newValue = availableShares * percentValue
            onAmountChange(formatAmountInputValue(newValue))
            focusInput()
          }}
        >
          {percentage}
        </button>
      ))
    }

    const chipValues = isMobile ? BUY_CHIPS_MOBILE : BUY_CHIPS_DESKTOP
    return chipValues.map(chip => (
      <button
        type="button"
        key={chip}
        className={`${baseClasses} hover:border-border hover:bg-white/10 dark:hover:bg-white/5`}
        onClick={() => {
          const chipValue = Number.parseInt(chip.substring(2), 10)
          const newValue = amountNumber + chipValue

          if (newValue <= 999999999) {
            onAmountChange(formatAmountInputValue(newValue))
            focusInput()
          }
        }}
      >
        {chip}
      </button>
    ))
  }

  const formattedAmount = formatDisplayAmount(amount)
  const inputValue = side === ORDER_SIDE.SELL
    ? formattedAmount
    : formattedAmount ? `$${formattedAmount}` : ''

  return (
    <>
      {isMobile
        ? (
            <div className="mb-4">
              <div className="mb-4 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => decrementAmount(side === ORDER_SIDE.SELL ? 0.1 : 1)}
                  className={`
                    flex size-12 items-center justify-center rounded-lg bg-muted text-2xl font-bold transition-colors
                    hover:bg-muted/80
                  `}
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <input
                    ref={inputRef}
                    type="text"
                    className={`
                      w-full
                      [appearance:textfield]
                      border-0 bg-transparent text-center text-4xl font-bold text-foreground
                      placeholder-muted-foreground outline-hidden
                      [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                    `}
                    placeholder={side === ORDER_SIDE.SELL ? '0' : '$0.00'}
                    value={inputValue}
                    onChange={e => handleInputChange(e.target.value)}
                    onBlur={e => handleBlur(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => incrementAmount(side === ORDER_SIDE.SELL ? 0.1 : 1)}
                  className={`
                    flex size-12 items-center justify-center rounded-lg bg-muted text-2xl font-bold transition-colors
                    hover:bg-muted/80
                  `}
                >
                  +
                </button>
              </div>
            </div>
          )
        : (
            <div className="mb-2 flex items-center gap-3">
              <div className="shrink-0">
                <div className="text-lg font-medium">
                  {side === ORDER_SIDE.SELL ? 'Shares' : 'Amount'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {side === ORDER_SIDE.SELL ? '' : `Balance $${balance.text || '0.00'}`}
                </div>
              </div>
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  className={`
                    h-14 w-full
                    [appearance:textfield]
                    border-0 bg-transparent text-right text-4xl font-bold text-slate-700 placeholder-slate-400
                    outline-hidden
                    dark:text-slate-300 dark:placeholder-slate-500
                    [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                  `}
                  placeholder={side === ORDER_SIDE.SELL ? '0' : '$0.00'}
                  value={inputValue}
                  onChange={e => handleInputChange(e.target.value)}
                  onBlur={e => handleBlur(e.target.value)}
                />
              </div>
            </div>
          )}

      <div
        className={cn(
          'mb-3 flex gap-2',
          isMobile ? 'justify-center' : 'justify-end',
        )}
      >
        {renderActionButtons()}
        <button
          type="button"
          className={cn(
            'h-7 rounded-lg border px-3 text-[11px] font-semibold transition-all duration-200 ease-in-out',
            side === ORDER_SIDE.SELL && availableShares <= 0
              ? 'cursor-not-allowed opacity-50'
              : 'hover:border-border hover:bg-white/10 dark:hover:bg-white/5',
          )}
          disabled={side === ORDER_SIDE.SELL && availableShares <= 0}
          onClick={() => {
            if (side === ORDER_SIDE.SELL) {
              if (availableShares <= 0) {
                return
              }
              onAmountChange(formatAmountInputValue(availableShares))
            }
            else {
              const maxBalance = balance.raw
              const limitedBalance = Math.min(maxBalance, 999999999)
              onAmountChange(formatAmountInputValue(limitedBalance))
            }
            focusInput()
          }}
        >
          MAX
        </button>
      </div>
    </>
  )
}
