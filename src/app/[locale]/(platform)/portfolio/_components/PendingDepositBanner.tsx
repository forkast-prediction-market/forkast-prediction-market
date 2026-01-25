'use client'

import { ArrowDownToLine, CheckIcon, Loader2Icon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSignMessage } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { usePendingUsdcDeposit } from '@/hooks/usePendingUsdcDeposit'
import { useRouter } from '@/i18n/navigation'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { formatCurrency } from '@/lib/formatters'
import { triggerConfettiColorful } from '@/lib/utils'
import { isUserRejectedRequestError } from '@/lib/wallet'

const RELAYER_SIGNATURE_HASH = '0x16bc61429de6c366f24a7c3f6eb282898e798a277988a3fb62f22fc37a87ec59'
const CONFIRMATION_DELAY_MS = 900

type PendingDepositStep = 'prompt' | 'signing' | 'success'

export default function PendingDepositBanner() {
  const { pendingBalance, hasPendingDeposit } = usePendingUsdcDeposit()
  const { signMessageAsync } = useSignMessage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<PendingDepositStep>('prompt')

  const formattedAmount = useMemo(() => formatCurrency(pendingBalance.raw, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }), [pendingBalance.raw])

  useEffect(() => {
    if (!open) {
      setStep('prompt')
    }
  }, [open])

  useEffect(() => {
    if (step !== 'success') {
      return
    }

    triggerConfettiColorful()
  }, [step])

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (step === 'signing') {
      return
    }

    setStep('signing')

    try {
      await signMessageAsync({ message: { raw: RELAYER_SIGNATURE_HASH } })
      await new Promise(resolve => setTimeout(resolve, CONFIRMATION_DELAY_MS))
      setStep('success')
    }
    catch (error) {
      if (!isUserRejectedRequestError(error)) {
        const message = error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE
        toast.error(message)
      }
      setStep('prompt')
    }
  }, [signMessageAsync, step])

  const handleStartTrading = useCallback(() => {
    setOpen(false)
    router.push('/')
  }, [router])

  if (!hasPendingDeposit) {
    return null
  }

  return (
    <>
      <Button
        className="h-11 w-full justify-between px-4 text-left"
        onClick={() => setOpen(true)}
      >
        <span className="text-sm font-semibold">Confirm pending deposit</span>
        <ArrowDownToLine className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md border bg-background p-8 text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-yes">
            {step === 'signing'
              ? <Loader2Icon className="size-9 animate-spin text-background" />
              : <CheckIcon className="size-10 text-background" />}
          </div>

          {step === 'signing' && (
            <p className="mt-6 text-base font-semibold text-foreground">Waiting for signature...</p>
          )}

          {step === 'prompt' && (
            <p className="mt-6 text-base font-semibold text-foreground">
              Activate your funds (
              {formattedAmount}
              ) to begin trading.
            </p>
          )}

          {step === 'success' && (
            <p className="mt-6 text-base font-semibold text-foreground">Your funds are available to trade!</p>
          )}

          {step === 'prompt' && (
            <Button className="mt-6 h-11 w-full text-base" onClick={handleConfirm}>
              Continue
            </Button>
          )}

          {step === 'signing' && (
            <div className="mt-6 text-sm text-muted-foreground">
              Confirm the signature in your wallet.
            </div>
          )}

          {step === 'success' && (
            <Button className="mt-6 h-11 w-full text-base" onClick={handleStartTrading}>
              Start Trading
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
