import type { SafeTransactionRequestPayload } from '@/lib/safe/transactions'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { hashTypedData } from 'viem'
import { useSignMessage } from 'wagmi'
import { getSafeNonceAction, submitSafeTransactionAction } from '@/app/(platform)/_actions/approve-tokens'
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
import { defaultNetwork } from '@/lib/appkit'
import { DEFAULT_CONDITION_PARTITION, DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { ZERO_COLLECTION_ID } from '@/lib/contracts'
import { formatAmountInputValue, toMicro } from '@/lib/formatters'
import {
  aggregateSafeTransactions,
  buildSplitPositionTransaction,
  getSafeTxTypedData,
  packSafeSignature,

} from '@/lib/safe/transactions'
import { cn } from '@/lib/utils'
import { useTradingOnboarding } from '@/providers/TradingOnboardingProvider'
import { useUser } from '@/stores/useUser'

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
  const { ensureTradingReady } = useTradingOnboarding()
  const user = useUser()
  const { signMessageAsync } = useSignMessage()
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

    if (!ensureTradingReady()) {
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

    if (!user?.proxy_wallet_address || !user?.address) {
      toast.error('Deploy your proxy wallet before splitting shares.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const nonceResult = await getSafeNonceAction()
      if (nonceResult.error || !nonceResult.nonce) {
        toast.error(nonceResult.error ?? DEFAULT_ERROR_MESSAGE)
        setIsSubmitting(false)
        return
      }

      const transactions = [
        buildSplitPositionTransaction({
          conditionId: conditionId as `0x${string}`,
          partition: [...DEFAULT_CONDITION_PARTITION],
          amount: toMicro(numericAmount),
          parentCollectionId: ZERO_COLLECTION_ID,
        }),
      ]

      const aggregated = aggregateSafeTransactions(transactions)
      const typedData = getSafeTxTypedData({
        chainId: defaultNetwork.id,
        safeAddress: user.proxy_wallet_address as `0x${string}`,
        transaction: aggregated,
        nonce: nonceResult.nonce,
      })

      const { signatureParams, ...safeTypedData } = typedData
      const structHash = hashTypedData({
        domain: safeTypedData.domain,
        types: safeTypedData.types,
        primaryType: safeTypedData.primaryType,
        message: safeTypedData.message,
      }) as `0x${string}`

      const signature = await signMessageAsync({
        message: { raw: structHash },
      })

      const payload: SafeTransactionRequestPayload = {
        type: 'SAFE',
        from: user.address,
        to: aggregated.to,
        proxyWallet: user.proxy_wallet_address,
        data: aggregated.data,
        nonce: nonceResult.nonce,
        signature: packSafeSignature(signature as `0x${string}`),
        signatureParams,
        metadata: 'split_position',
      }

      const response = await submitSafeTransactionAction(payload)

      if (response?.error) {
        toast.error(response.error)
        setIsSubmitting(false)
        return
      }

      toast.success('Split shares', {
        description: marketTitle ?? 'Request submitted.',
      })

      void queryClient.invalidateQueries({ queryKey: ['user-conditional-shares'] })
      void queryClient.invalidateQueries({ queryKey: [SAFE_BALANCE_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: ['user-market-positions'] })
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['user-conditional-shares'] })
        void queryClient.invalidateQueries({ queryKey: [SAFE_BALANCE_QUERY_KEY] })
      }, 3000)
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['user-market-positions'] })
      }, 3000)
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['user-conditional-shares'] })
        void queryClient.invalidateQueries({ queryKey: ['user-market-positions'] })
      }, 12_000)
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
