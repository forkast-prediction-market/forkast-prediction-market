import type { Event } from '@/types'
import confetti from 'canvas-confetti'
import { CircleCheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  event: Event
  tradingState: ReturnType<typeof import('@/hooks/useTradingState').useTradingState>
  isMobileVersion?: boolean
}

export default function EventOrderPanelWinCard({ event, tradingState, isMobileVersion = false }: Props) {
  const getSelectedOutcome = tradingState.getSelectedOutcome

  const outcomeName
        = tradingState.yesNoSelection === 'yes'
          ? tradingState.yesOutcome?.name || 'Yes'
          : getSelectedOutcome()?.name || 'No'
  const shares = tradingState.amount && !Number.isNaN(Number(tradingState.amount)) ? Number(tradingState.amount) : 1.1
  const valuePerShare
        = tradingState.amount && !Number.isNaN(Number(tradingState.amount))
          ? Number.parseFloat((Number.parseFloat(tradingState.amount) / shares).toFixed(2))
          : 1.0
  const total = shares * valuePerShare

  // Function to trigger blue confetti from the button
  function triggerBlueConfetti(
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    if (!event || !event.currentTarget) {
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (rect.left + rect.width / 2) / window.innerWidth
    const y = (rect.top + rect.height / 2) / window.innerHeight
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { x, y },
      colors: ['#2563eb', '#1d4ed8', '#3b82f6', '#60a5fa'],
    })
  }

  let outcomeLabel = outcomeName
  if (tradingState.isMultiMarket) {
    const selectedOutcome = getSelectedOutcome()
    if (selectedOutcome) {
      outcomeLabel = `${selectedOutcome.name} - ${
        tradingState.yesNoSelection === 'yes' ? 'Yes' : 'No'
      }`
    }
  }

  return (
    <div
      className={`
          flex flex-col items-center justify-center rounded-lg border p-6
          ${isMobileVersion ? 'w-full' : 'w-full lg:w-[320px]'}`}
    >
      <CircleCheckIcon size={56} className="mb-2 text-primary" />
      <div className="mb-1 text-center text-xl font-bold text-primary">
        Outcome:
        {' '}
        {outcomeLabel}
      </div>
      {!tradingState.claimed && <hr className="my-4 w-full border" />}
      {!tradingState.claimed && (
        <>
          <div className="mb-2 text-center text-lg font-bold text-foreground">
            Your Earnings
          </div>
          <div className="flex w-full flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Position:</span>
              <span className="font-medium text-foreground">
                {shares}
                {' '}
                {outcomeLabel}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Value per Share:</span>
              <span className="font-medium text-foreground">
                $
                {valuePerShare.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium text-foreground">
                $
                {total.toFixed(2)}
              </span>
            </div>
          </div>
          <Button
            type="button"
            onClick={async (e) => {
              tradingState.setClaiming(true)
              triggerBlueConfetti(e)
              await new Promise(res => setTimeout(res, 1800))
              tradingState.setClaiming(false)
              tradingState.setClaimed(true)
              // Show success toast for claim
              toast.success('Redeem shares', {
                description: (
                  <div>
                    <div className="font-medium">{event.title}</div>
                  </div>
                ),
              })
            }}
            disabled={tradingState.claiming}
          >
            {tradingState.claiming
              ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent">
                    </div>
                    <span>Confirming...</span>
                  </div>
                )
              : (
                  'Claim winnings'
                )}
          </Button>
        </>
      )}
      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        By trading, you agree to our Terms of Service
      </p>
    </div>
  )
}
