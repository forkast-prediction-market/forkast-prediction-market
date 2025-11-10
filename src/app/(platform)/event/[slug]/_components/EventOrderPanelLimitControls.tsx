import type { LimitExpirationOption } from '@/stores/useOrder'
import type { OrderSide } from '@/types'
import { BanknoteIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ORDER_SIDE } from '@/lib/constants'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

interface EventOrderPanelLimitControlsProps {
  side: OrderSide
  limitPrice: string
  limitShares: string
  limitExpirationEnabled: boolean
  limitExpirationOption: LimitExpirationOption
  isLimitOrder: boolean
  availableShares: number
  onLimitPriceChange: (value: string) => void
  onLimitSharesChange: (value: string) => void
  onLimitExpirationEnabledChange: (value: boolean) => void
  onLimitExpirationOptionChange: (value: LimitExpirationOption) => void
  onAmountUpdateFromLimit: (value: string) => void
}

export default function EventOrderPanelLimitControls({
  side,
  limitPrice,
  limitShares,
  limitExpirationEnabled,
  limitExpirationOption,
  isLimitOrder,
  availableShares,
  onLimitPriceChange,
  onLimitSharesChange,
  onLimitExpirationEnabledChange,
  onLimitExpirationOptionChange,
  onAmountUpdateFromLimit,
}: EventOrderPanelLimitControlsProps) {
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
    if (limitSharesNumber <= 0) {
      return 0
    }

    if (side === ORDER_SIDE.SELL) {
      const total = (limitPriceNumber * limitSharesNumber) / 100
      return Number.isFinite(total) ? total : 0
    }

    const payoutPerShare = (100 - limitPriceNumber) / 100
    const total = limitSharesNumber * payoutPerShare
    return Number.isFinite(total) ? total : 0
  }, [limitPriceNumber, limitSharesNumber, side])

  function syncAmount(priceValue: number, sharesValue: number) {
    if (!isLimitOrder) {
      return
    }

    const nextAmount = (priceValue * sharesValue) / 100
    onAmountUpdateFromLimit((sharesValue === 0 || nextAmount === 0)
      ? '0.00'
      : nextAmount.toFixed(2))
  }

  function updateLimitPrice(nextValue: number) {
    const clampedValue = clamp(Number.isNaN(nextValue) ? 0 : nextValue, 0, 99.9)
    const nextPrice = clampedValue.toFixed(1)
    onLimitPriceChange(nextPrice)
    syncAmount(clampedValue, Number.parseFloat(limitShares) || 0)
  }

  function updateLimitShares(nextValue: number) {
    const clampedValue = clamp(Number.isNaN(nextValue) ? 0 : nextValue, 0, 999_999)
    const nextShares = clampedValue.toString()
    onLimitSharesChange(nextShares)
    syncAmount(Number.parseFloat(limitPrice) || 0, clampedValue)
  }

  return (
    <div className="mt-4 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-medium text-foreground">
          Limit Price
        </span>

        <NumberInput
          value={limitPriceNumber}
          onChange={updateLimitPrice}
        />
      </div>

      <div className="my-4 border-b border-border" />

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-lg font-medium text-foreground">
            Shares
          </span>
          <div className="flex w-1/2 items-center justify-end gap-2">
            <Input
              placeholder="0"
              inputMode="decimal"
              value={limitShares}
              onChange={(event) => {
                const value = Number.parseFloat(event.target.value || '0')
                updateLimitShares(value)
              }}
              className="h-10 !bg-transparent text-right !text-lg font-bold"
            />
          </div>
        </div>
        {side === ORDER_SIDE.SELL
          ? (
              <div className="ml-auto flex h-8 w-1/2 justify-end gap-2">
                {['25%', '50%', 'MAX'].map(label => (
                  <button
                    type="button"
                    key={label}
                    className={`
                      rounded-md bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors
                      hover:bg-muted/80
                    `}
                    onClick={() => {
                      if (availableShares <= 0) {
                        return
                      }

                      if (label === 'MAX') {
                        updateLimitShares(availableShares)
                        return
                      }

                      const percent = Number.parseInt(label.replace('%', ''), 10) / 100
                      const calculatedShares = Number.parseFloat((availableShares * percent).toFixed(2))
                      updateLimitShares(calculatedShares)
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )
          : (
              <div className="ml-auto flex h-8 w-1/2 justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => updateLimitShares(limitSharesNumber - 10)}
                >
                  -10
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => updateLimitShares(limitSharesNumber + 10)}
                >
                  +10
                </Button>
              </div>
            )}
      </div>

      <div className="my-4 border-b border-border" />

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>Set Expiration</span>
          <Switch
            checked={limitExpirationEnabled}
            onCheckedChange={(checked) => {
              onLimitExpirationEnabledChange(checked)
              if (!checked) {
                onLimitExpirationOptionChange('end-of-day')
              }
            }}
          />
        </div>

        {limitExpirationEnabled && (
          <Select
            value={limitExpirationOption}
            onValueChange={(value) => {
              onLimitExpirationOptionChange(value as LimitExpirationOption)
            }}
          >
            <SelectTrigger className="w-full justify-between bg-background text-sm font-medium">
              <SelectValue placeholder="Select expiration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="end-of-day">End of Day</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="mt-6 space-y-1">
        <div className="flex items-center justify-between text-lg font-bold text-foreground">
          <span>Total</span>
          <span className="font-semibold text-primary">
            $
            {totalValue.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-lg font-bold">
          <span className="flex items-center gap-2 text-foreground">
            To Win
            <BanknoteIcon className="size-4 text-yes" />
          </span>
          <span className="text-xl font-bold text-yes">
            $
            {potentialWin.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
