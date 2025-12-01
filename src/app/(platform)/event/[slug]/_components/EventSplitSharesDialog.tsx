import { useQueryClient } from '@tanstack/react-query'
import { CheckIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { splitPositionAction } from '@/app/(platform)/event/[slug]/_actions/position-operations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SAFE_BALANCE_QUERY_KEY } from '@/hooks/useBalance'
import { formatAmountInputValue } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface EventSplitSharesDialogProps {
  open: boolean
  availableUsdc: number
  conditionId?: string
  marketTitle?: string
  onOpenChange: (open: boolean) => void
}

export default function EventSplitSharesDialog({
  open,
  availableUsdc,
  conditionId,
  marketTitle,
  onOpenChange,
}: EventSplitSharesDialogProps) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setAmount('')
      setError(null)
      setIsSubmitting(false)
    }
  }, [open])

  const formattedUsdcBalance = useMemo(() => {
    if (!Number.isFinite(availableUsdc)) {
      return '$0.00'
    }
    return availableUsdc.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }, [availableUsdc])

  const numericAvailableBalance = Number.isFinite(availableUsdc) ? availableUsdc : 0

  function handleAmountChange(value: string) {
    const sanitized = value.replace(/,/g, '.')
    if (sanitized === '' || /^\d*(?:\.\d*)?$/.test(sanitized)) {
      setAmount(sanitized)
      setError(null)
    }
  }

  function handleMaxClick() {
    if (numericAvailableBalance <= 0) {
      return
    }

    const formatted = formatAmountInputValue(numericAvailableBalance) || numericAvailableBalance.toFixed(2)
    setAmount(formatted)
    setError(null)
  }

  async function handleSubmit() {
    if (!conditionId) {
      toast.error('Select a market before splitting shares.')
      return
    }

    const numericAmount = Number.parseFloat(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a valid amount.')
      return
    }

    if (numericAmount > numericAvailableBalance) {
      setError('Amount exceeds available balance.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await splitPositionAction({
        conditionId,
        amount: numericAmount.toString(),
      })

      if (response?.error) {
        toast.error(response.error)
        return
      }

      toast.success('Split shares', {
        description: marketTitle ?? 'Request submitted.',
        icon: <SuccessIcon />,
      })
      void queryClient.invalidateQueries({ queryKey: [SAFE_BALANCE_QUERY_KEY] })
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: [SAFE_BALANCE_QUERY_KEY] })
      }, 3000)
      setAmount('')
      onOpenChange(false)
    }
    catch (error) {
      console.error('Failed to submit split operation.', error)
      toast.error('We could not submit your split request. Please try again.')
    }
    finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:p-8">
        <div className="space-y-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-center text-2xl font-bold">Split shares</DialogTitle>
            <DialogDescription className="text-center text-sm text-foreground">
              Split a USDC into a share of Yes and No. You can do this to save cost by getting both and just selling the other side.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground" htmlFor="split-shares-amount">
              Amount
            </label>
            <Input
              id="split-shares-amount"
              value={amount}
              onChange={event => handleAmountChange(event.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className="h-12 text-base"
            />
            <div className="text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                Available:
                <strong className="text-foreground">{formattedUsdcBalance}</strong>
                <span className="text-muted-foreground">USDC</span>
                <button
                  type="button"
                  className={cn(
                    'text-primary transition-colors',
                    numericAvailableBalance > 0 ? 'hover:opacity-80' : 'cursor-not-allowed opacity-40',
                  )}
                  onClick={handleMaxClick}
                  disabled={numericAvailableBalance <= 0}
                >
                  Max
                </button>
              </span>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          </div>

          <Button
            type="button"
            size="outcome"
            className="w-full text-base font-bold"
            disabled={isSubmitting || !conditionId}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Splitting...' : 'Split Shares'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SuccessIcon() {
  return (
    <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
      <CheckIcon className="size-4" />
    </span>
  )
}
