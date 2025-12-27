import type { RefObject } from 'react'
import type { LimitExpirationOption } from '@/stores/useOrder'
import type { OrderSide } from '@/types'
import { TriangleAlertIcon } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import EventLimitExpirationCalendar from '@/app/(platform)/event/[slug]/_components/EventLimitExpirationCalendar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { formatDisplayAmount, getAmountSizeClass, MAX_AMOUNT_INPUT, sanitizeNumericInput } from '@/lib/amount-input'
import { ORDER_SIDE } from '@/lib/constants'
import { formatAmountInputValue, formatCurrency } from '@/lib/formatters'
import { MIN_LIMIT_ORDER_SHARES } from '@/lib/orders/validation'
import { cn } from '@/lib/utils'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

interface EventOrderPanelLimitControlsProps {
  side: OrderSide
  limitPrice: string
  limitShares: string
  limitExpirationEnabled: boolean
  limitExpirationOption: LimitExpirationOption
  limitExpirationTimestamp: number | null
  isLimitOrder: boolean
  availableShares: number
  showLimitMinimumWarning: boolean
  shouldShakeShares?: boolean
  limitSharesRef?: RefObject<HTMLInputElement | null>
  onLimitPriceChange: (value: string) => void
  onLimitSharesChange: (value: string) => void
  onLimitExpirationEnabledChange: (value: boolean) => void
  onLimitExpirationOptionChange: (value: LimitExpirationOption) => void
  onLimitExpirationTimestampChange: (value: number | null) => void
  onAmountUpdateFromLimit: (value: string) => void
}

export default function EventOrderPanelLimitControls({
  side,
  limitPrice,
  limitShares,
  limitExpirationEnabled,
  limitExpirationOption,
  limitExpirationTimestamp,
  isLimitOrder,
  availableShares,
  showLimitMinimumWarning,
  shouldShakeShares,
  limitSharesRef,
  onLimitPriceChange,
  onLimitSharesChange,
  onLimitExpirationEnabledChange,
  onLimitExpirationOptionChange,
  onLimitExpirationTimestampChange,
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

  const maxSharesForSide = MAX_AMOUNT_INPUT

  const totalValueLabel = formatCurrency(totalValue)
  const potentialWinLabel = formatCurrency(potentialWin)
  const showMinimumSharesWarning = showLimitMinimumWarning && isLimitOrder && limitSharesNumber < MIN_LIMIT_ORDER_SHARES
  const [isExpirationModalOpen, setIsExpirationModalOpen] = useState(false)
  const [draftExpiration, setDraftExpiration] = useState<Date>(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30, 0, 0)
    return now
  })
  const customExpirationLabel = useMemo(() => {
    if (!limitExpirationTimestamp) {
      return null
    }
    const date = new Date(limitExpirationTimestamp * 1000)
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [limitExpirationTimestamp])

  function syncAmount(priceValue: number, sharesValue: number) {
    if (!isLimitOrder) {
      return
    }

    const nextAmount = (priceValue * sharesValue) / 100
    onAmountUpdateFromLimit(formatAmountInputValue(nextAmount))
  }

  function handleLimitSharesInputChange(rawValue: string) {
    const cleaned = sanitizeNumericInput(rawValue)

    if (cleaned === '') {
      onLimitSharesChange('')
      syncAmount(limitPriceNumber, 0)
      return
    }

    const numericValue = Number.parseFloat(cleaned)
    if (Number.isNaN(numericValue)) {
      onLimitSharesChange('')
      syncAmount(limitPriceNumber, 0)
      return
    }

    const clamped = Math.min(numericValue, maxSharesForSide)
    onLimitSharesChange(formatAmountInputValue(clamped))
    syncAmount(limitPriceNumber, clamped)
  }

  function updateLimitPrice(nextValue: number) {
    const clampedValue = clamp(Number.isNaN(nextValue) ? 0 : nextValue, 0, 99.9)
    const nextPrice = clampedValue.toFixed(1)
    onLimitPriceChange(nextPrice)
    syncAmount(clampedValue, Number.parseFloat(limitShares) || 0)
  }

  function updateLimitShares(nextValue: number, roundingMode: 'round' | 'floor' = 'round') {
    const numericValue = Number.isNaN(nextValue) ? 0 : nextValue
    const clampedValue = clamp(numericValue, 0, maxSharesForSide)
    onLimitSharesChange(formatAmountInputValue(clampedValue, { roundingMode }))
    syncAmount(Number.parseFloat(limitPrice) || 0, clampedValue)
  }

  const formattedLimitShares = formatDisplayAmount(limitShares)
  const limitSharesSizeClass = getAmountSizeClass(limitShares, {
    large: 'text-lg',
    medium: 'text-base',
    small: 'text-sm',
  })
  useEffect(() => {
    if (limitExpirationTimestamp) {
      setDraftExpiration(new Date(limitExpirationTimestamp * 1000))
      return
    }

    const now = new Date()
    now.setMinutes(now.getMinutes() + 30, 0, 0)
    setDraftExpiration(now)
  }, [limitExpirationTimestamp])

  function openExpirationModal() {
    setIsExpirationModalOpen(true)
  }

  function handleExpirationModalChange(open: boolean) {
    setIsExpirationModalOpen(open)
  }

  function handleApplyExpiration() {
    if (!draftExpiration) {
      return
    }

    if (draftExpiration.getTime() <= Date.now()) {
      toast.error('Expiration must be in future. Try again')
      return
    }

    const timestampSeconds = Math.floor(draftExpiration.getTime() / 1000)
    onLimitExpirationTimestampChange(timestampSeconds)
    setIsExpirationModalOpen(false)
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
          <span
            className={cn(
              'text-lg font-medium text-foreground',
              shouldShakeShares && 'animate-order-shake',
            )}
          >
            Shares
          </span>
          <div className="flex w-1/2 items-center justify-end gap-2">
            <Input
              ref={limitSharesRef}
              placeholder="0"
              inputMode="decimal"
              value={formattedLimitShares}
              onChange={event => handleLimitSharesInputChange(event.target.value)}
              className={cn(
                'h-10 bg-transparent! text-right font-bold',
                limitSharesSizeClass,
                shouldShakeShares && 'animate-order-shake',
              )}
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
                        updateLimitShares(availableShares, 'floor')
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
                onLimitExpirationTimestampChange(null)
              }
            }}
          />
        </div>

        {limitExpirationEnabled && (
          <div className="space-y-3">
            <Select
              value={limitExpirationOption}
              onValueChange={(value) => {
                const nextValue = value as LimitExpirationOption
                onLimitExpirationOptionChange(nextValue)

                if (nextValue === 'custom') {
                  openExpirationModal()
                }
                else {
                  onLimitExpirationTimestampChange(null)
                }
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

            {limitExpirationOption === 'custom' && (
              <div className={`
                flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground
              `}
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">Custom expiration</span>
                  <span>{customExpirationLabel ?? 'Select a date and time to apply.'}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={openExpirationModal}
                >
                  Edit
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1">
        {side === ORDER_SIDE.SELL
          ? (
              <div className="flex items-center justify-between text-lg font-bold text-foreground">
                <span>You'll receive</span>
                <span className="inline-flex items-center gap-2 text-xl font-bold text-yes">
                  <Image
                    src="/images/trade/money.svg"
                    alt=""
                    width={20}
                    height={14}
                    className="h-4 w-6"
                  />
                  {potentialWinLabel}
                </span>
              </div>
            )
          : (
              <>
                <div className="flex items-center justify-between text-lg font-bold text-foreground">
                  <span>Total</span>
                  <span className="font-semibold text-primary">
                    {totalValueLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-lg font-bold">
                  <span className="flex items-center gap-2 text-foreground">
                    To Win
                    <Image
                      src="/images/trade/money.svg"
                      alt=""
                      width={20}
                      height={14}
                      className="h-4 w-6"
                    />
                  </span>
                  <span className="text-xl font-bold text-yes">
                    {potentialWinLabel}
                  </span>
                </div>
              </>
            )}
      </div>
      {showMinimumSharesWarning && (
        <div className="flex items-center justify-center gap-2 pt-2 text-sm font-semibold text-orange-500">
          <TriangleAlertIcon className="size-4" />
          Minimum
          {' '}
          {MIN_LIMIT_ORDER_SHARES}
          {' '}
          shares for limit orders
        </div>
      )}

      <Dialog open={isExpirationModalOpen} onOpenChange={handleExpirationModalChange}>
        <DialogContent className="w-fit max-w-md min-w-[320px] space-y-4">
          <DialogHeader>
            <DialogTitle>Select expiration</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <EventLimitExpirationCalendar
              value={draftExpiration}
              onChange={(nextDate) => {
                if (nextDate) {
                  setDraftExpiration(nextDate)
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsExpirationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleApplyExpiration}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
