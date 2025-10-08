import { useBalance } from '@/hooks/useBalance'
import { cn } from '@/lib/utils'
import { useAmountAsNumber, useOrder } from '@/stores/useOrder'

interface EventOrderPanelInputSectionProps {
  isMobile: boolean
  getUserShares: () => number
}

export default function EventOrderPanelInput({
  isMobile,
  getUserShares,
}: EventOrderPanelInputSectionProps) {
  const state = useOrder()
  const amount = useAmountAsNumber()
  const { balance } = useBalance()

  // Function to render action buttons (percentage and value)
  function renderActionButtons(isMobile: boolean) {
    const baseButtonClasses = 'h-7 px-3 rounded-lg border text-[11px] transition-all duration-200 ease-in-out'

    if (state.side === 'sell') {
      const userShares = getUserShares()
      const isDisabled = userShares <= 0

      return ['25%', '50%', '75%'].map(percentage => (
        <button
          type="button"
          key={percentage}
          className={`${baseButtonClasses} ${
            isDisabled
              ? 'cursor-not-allowed opacity-50'
              : 'hover:bg-white/10 dark:hover:bg-white/5'
          }`}
          disabled={isDisabled}
          onClick={() => {
            if (isDisabled) {
              return
            }
            const percentValue = Number.parseInt(percentage.replace('%', '')) / 100
            const newValue = (userShares * percentValue).toFixed(2)
            state.setAmount(newValue)
            state.inputRef?.current?.focus()
          }}
        >
          {percentage}
        </button>
      ))
    }
    else {
      const chipValues = isMobile
        ? ['+$1', '+$20', '+$100']
        : ['+$5', '+$25', '+$100']

      return chipValues.map(chip => (
        <button
          type="button"
          key={chip}
          className={`${baseButtonClasses} hover:border-border hover:bg-white/10 dark:hover:bg-white/5`}
          onClick={() => {
            const chipValue = Number.parseInt(chip.substring(2))
            const newValue = amount + chipValue

            if (newValue <= 999999999) {
              state.setAmount(newValue.toFixed(2))
              state.inputRef?.current?.focus()
            }
          }}
        >
          {chip}
        </button>
      ))
    }
  }

  return (
    <>
      {/* Amount/Shares */}
      {isMobile
        ? (
            <div className="mb-4">
              <div className="mb-4 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const newValue = Math.max(
                      0,
                      amount - (state.side === 'sell' ? 0.1 : 1),
                    )
                    state.setAmount(newValue.toFixed(2))
                  }}
                  className={`
                    flex size-12 items-center justify-center rounded-lg bg-muted text-2xl font-bold transition-colors
                    hover:bg-muted/80
                  `}
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <input
                    ref={state.inputRef}
                    type="text"
                    className={`
                      w-full
                      [appearance:textfield]
                      border-0 bg-transparent text-center text-4xl font-bold text-foreground
                      placeholder-muted-foreground outline-hidden
                      [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                    `}
                    placeholder={state.side === 'sell' ? '0' : '$1.00'}
                    value={
                      state.side === 'sell'
                        ? state.amount
                        : `$${state.amount}`
                    }
                    onChange={(e) => {
                      const rawValue = state.side === 'sell'
                        ? e.target.value
                        : e.target.value.replace(/[^0-9.]/g, '')

                      const value = state.side === 'sell'
                        ? Number.parseFloat(rawValue).toFixed(2)
                        : rawValue

                      const numericValue = Number.parseFloat(value)

                      if (state.side === 'sell') {
                        // For sell, limit by the amount of shares the user has
                        const userShares = getUserShares()
                        if (numericValue <= userShares || value === '') {
                          state.setAmount(value)
                        }
                      }
                      else {
                        // For buy, limit as before
                        if (numericValue <= 99999 || value === '') {
                          state.setAmount(value)
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '')
                      if (value && !Number.isNaN(Number.parseFloat(value))) {
                        state.setAmount(Number.parseFloat(value).toFixed(2))
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newValue = amount + (state.side === 'sell' ? 0.1 : 1)

                    if (state.side === 'sell') {
                      const userShares = getUserShares()
                      if (newValue <= userShares) {
                        state.setAmount(newValue.toFixed(2))
                      }
                    }
                    else {
                      if (newValue <= 99999) {
                        state.setAmount(newValue.toFixed(2))
                      }
                    }
                  }}
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
                  {state.side === 'sell' ? 'Shares' : 'Amount'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {state.side === 'sell'
                    ? ``
                    : `Balance $${balance?.data?.text || '0.00'}`}
                </div>
              </div>
              <div className="relative flex-1">
                <input
                  ref={state.inputRef}
                  type="text"
                  className={`
                    h-14 w-full
                    [appearance:textfield]
                    border-0 bg-transparent text-right text-4xl font-bold text-slate-700 placeholder-slate-400
                    outline-hidden
                    dark:text-slate-300 dark:placeholder-slate-500
                    [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                  `}
                  placeholder={state.side === 'sell' ? '0' : '$0.00'}
                  value={
                    state.side === 'sell'
                      ? state.amount
                      : `$${state.amount}`
                  }
                  onChange={(e) => {
                    const rawValue = state.side === 'sell'
                      ? e.target.value
                      : e.target.value.replace(/[^0-9.]/g, '')

                    const value = state.side === 'sell'
                      ? Number.parseFloat(rawValue).toFixed(2)
                      : rawValue

                    const numericValue = Number.parseFloat(value)

                    if (state.side === 'sell') {
                      // For sell, limit by the amount of shares the user has
                      const userShares = getUserShares()
                      if (numericValue <= userShares || value === '') {
                        state.setAmount(value)
                      }
                    }
                    else {
                      // For buy, limit as before
                      if (numericValue <= 99999 || value === '') {
                        state.setAmount(value)
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '')
                    if (value && !Number.isNaN(Number.parseFloat(value))) {
                      state.setAmount(value)
                    }
                  }}
                />
              </div>
            </div>
          )}

      {/* Quick chips */}
      <div
        className={`mb-3 flex gap-2 ${
          isMobile ? 'justify-center' : 'justify-end'
        }`}
      >
        {renderActionButtons(isMobile)}
        {/* Max button */}
        <button
          type="button"
          className={cn(
            'h-7 rounded-lg border px-3 text-[11px] font-semibold transition-all duration-200 ease-in-out',
            state.side === 'sell' && getUserShares() <= 0
              ? 'cursor-not-allowed opacity-50'
              : 'hover:border-border hover:bg-white/10 dark:hover:bg-white/5',
          )}
          disabled={state.side === 'sell' && getUserShares() <= 0}
          onClick={() => {
            if (state.side === 'sell') {
              const userShares = getUserShares()
              if (userShares <= 0) {
                return
              }
              state.setAmount(userShares.toFixed(2))
            }
            else {
              const maxBalance = Number.parseFloat(balance?.data?.text)
              // Limit to 999,999,999
              const limitedBalance = Math.min(maxBalance, 999999999)
              state.setAmount(limitedBalance.toFixed(2))
            }
            state.inputRef?.current?.focus()
          }}
        >
          MAX
        </button>
      </div>
    </>
  )
}
