import type { LimitExpirationOption } from '@/stores/useOrder'
import { BanknoteIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Select as UiSelect,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getUserShares, useOrder } from '@/stores/useOrder'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export default function EventOrderPanelLimitControls() {
  const {
    type,
    market,
    outcome,
    limitPrice,
    limitShares,
    limitExpirationEnabled,
    limitExpirationOption,
    setLimitPrice,
    setLimitShares,
    setLimitExpirationEnabled,
    setLimitExpirationOption,
    setAmount,
  } = useOrder()

  const limitPriceNumber = useMemo(
    () => Number.parseFloat(limitPrice) || 0,
    [limitPrice],
  )

  const limitSharesNumber = useMemo(
    () => Number.parseFloat(limitShares) || 0,
    [limitShares],
  )

  const totalValue = useMemo(() => {
    const total = (limitPriceNumber * limitSharesNumber) / 100
    return Number.isFinite(total) ? total : 0
  }, [limitPriceNumber, limitSharesNumber])

  const potentialWin = useMemo(() => {
    if (!market) {
      return 0
    }

    const targetProbability = outcome?.outcome_index === 0
      ? market.probability
      : 100 - market.probability

    const payoutPerShare = (targetProbability || 0) / 100
    const total = limitSharesNumber * payoutPerShare
    return Number.isFinite(total) ? total : 0
  }, [limitSharesNumber, market, outcome])

  useEffect(() => {
    if (type !== 'limit') {
      return
    }

    setAmount(totalValue > 0 ? totalValue.toFixed(2) : '0.00')
  }, [type, totalValue, setAmount])

  function updateLimitPrice(nextValue: number) {
    const clampedValue = clamp(Number.isNaN(nextValue) ? 0 : nextValue, 0, 99.9)
    setLimitPrice(clampedValue.toFixed(1))
  }

  function updateLimitShares(nextValue: number) {
    const clampedValue = clamp(Number.isNaN(nextValue) ? 0 : nextValue, 0, 999999)
    setLimitShares(clampedValue.toString())
  }

  return (
    <div className="mt-4 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted-foreground">
          Limit Price
        </span>
        <div className="flex w-1/2 items-center justify-end gap-2">
          <button
            type="button"
            className={`
              flex size-8 items-center justify-center rounded-md border text-base font-semibold transition-colors
              hover:bg-muted
            `}
            onClick={() => updateLimitPrice(limitPriceNumber - 0.1)}
          >
            <MinusIcon className="size-4" />
          </button>
          <div className="flex flex-1 items-center justify-between rounded-md border px-2 py-2">
            <input
              type="text"
              inputMode="decimal"
              pattern="\d+(\.\d{0,1})?"
              value={limitPrice}
              onChange={(event) => {
                const sanitized = event.target.value.replace(/[^0-9.]/g, '')
                const parts = sanitized.split('.')
                const normalized = parts.length > 1
                  ? `${parts[0]}.${parts[1].slice(0, 1)}`
                  : parts[0]
                setLimitPrice(normalized || '0')
              }}
              onBlur={() => updateLimitPrice(Number.parseFloat(limitPrice))}
              placeholder="0.0"
              className="w-full bg-transparent text-center text-sm font-semibold outline-none"
            />
            <span className="ml-2 text-sm font-medium text-muted-foreground">c</span>
          </div>
          <button
            type="button"
            className={`
              flex size-8 items-center justify-center rounded-md border text-base font-semibold transition-colors
              hover:bg-muted
            `}
            onClick={() => updateLimitPrice(limitPriceNumber + 0.1)}
          >
            <PlusIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="my-4 border-b border-border"></div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-muted-foreground">
            Shares
          </span>
          <div className="flex w-1/2 items-center justify-end gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="0"
              value={limitShares}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value || '0', 10)
                updateLimitShares(value)
              }}
              className={`
                w-full
                [appearance:textfield]
                rounded-md border px-3 py-2 text-right text-sm font-semibold outline-none
                [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
              `}
            />
          </div>
        </div>
        {useOrder.getState().side === 'sell'
          ? (
              <div className="ml-auto flex w-1/2 justify-end gap-2">
                {['25%', '50%', 'MAX'].map(label => (
                  <button
                    type="button"
                    key={label}
                    className={`
                      rounded-md bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors
                      hover:bg-muted/80
                    `}
                    onClick={() => {
                      const userShares = getUserShares()

                      if (userShares <= 0) {
                        return
                      }

                      if (label === 'MAX') {
                        updateLimitShares(userShares)
                        return
                      }

                      const percent = Number.parseInt(label.replace('%', ''), 10) / 100
                      updateLimitShares(Math.floor(userShares * percent))
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )
          : (
              <div className="ml-auto flex w-1/2 justify-end gap-2">
                <button
                  type="button"
                  className={`
                    rounded-md bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors
                    hover:bg-muted/80
                  `}
                  onClick={() => updateLimitShares(limitSharesNumber - 10)}
                >
                  -10
                </button>
                <button
                  type="button"
                  className={`
                    rounded-md bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors
                    hover:bg-muted/80
                  `}
                  onClick={() => updateLimitShares(limitSharesNumber + 10)}
                >
                  +10
                </button>
              </div>
            )}
      </div>

      <div className="my-4 border-b border-border"></div>

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Set Expiration</span>
          <Switch
            checked={limitExpirationEnabled}
            onCheckedChange={(checked) => {
              setLimitExpirationEnabled(checked)
              if (!checked) {
                setLimitExpirationOption('end-of-day')
              }
            }}
          />
        </div>

        {limitExpirationEnabled && (
          <UiSelect
            value={limitExpirationOption}
            onValueChange={(value) => {
              setLimitExpirationOption(value as LimitExpirationOption)
            }}
          >
            <SelectTrigger className="w-full justify-between bg-background text-sm font-medium">
              <SelectValue placeholder="Select expiration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="end-of-day">End of Day</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </UiSelect>
        )}
      </div>

      <div className="mt-6 space-y-1">
        <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span>Total</span>
          <span className="text-primary">
            $
            {totalValue.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-base font-semibold">
          <span className="flex items-center gap-2 text-muted-foreground">
            To Win
            <BanknoteIcon className="size-4 text-yes" />
          </span>
          <span className="text-yes">
            $
            {potentialWin.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
