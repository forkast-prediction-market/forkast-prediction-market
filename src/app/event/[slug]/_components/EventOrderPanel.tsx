import type { Event } from '@/types'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import EventOrderPanelForm from './EventOrderPanelForm'
import EventOrderPanelWinCard from './EventOrderPanelWinCard'

interface Props {
  event: Event
  tradingState: ReturnType<typeof import('@/hooks/useTradingState').useTradingState>
  isMobileVersion?: boolean
}

export default function EventOrderPanel({ event, tradingState, isMobileVersion = false }: Props) {
  // Utility functions
  const getSelectedOutcome = tradingState.getSelectedOutcome
  const yesPrice = tradingState.yesPrice
  const noPrice = tradingState.noPrice

  // Function to calculate the amount the user will receive when selling shares
  function calculateSellAmount(sharesToSell: number) {
    if (!tradingState.selectedOutcomeForOrder || !tradingState.yesNoSelection) {
      return 0
    }

    const selectedOutcome = getSelectedOutcome()
    if (!selectedOutcome) {
      return 0
    }

    const sellPrice
        = tradingState.yesNoSelection === 'yes'
          ? (selectedOutcome.probability / 100) * 0.95 // 5% spread for sell
          : ((100 - selectedOutcome.probability) / 100) * 0.95

    return sharesToSell * sellPrice
  }

  // Function to get the average selling price
  function getAvgSellPrice() {
    if (!tradingState.selectedOutcomeForOrder || !tradingState.yesNoSelection) {
      return '0'
    }

    const selectedOutcome = getSelectedOutcome()
    if (!selectedOutcome) {
      return '0'
    }

    const sellPrice
        = tradingState.yesNoSelection === 'yes'
          ? Math.round(selectedOutcome.probability * 0.95) // 5% spread for sell
          : Math.round((100 - selectedOutcome.probability) * 0.95)

    return sellPrice.toString()
  }

  // Confetti effects
  function triggerYesConfetti(event?: React.MouseEvent) {
    let origin: { x?: number, y: number } = { y: 0.6 }

    if (event && event.currentTarget) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      const x = (rect.left + rect.width / 2) / window.innerWidth
      const y = (rect.top + rect.height / 2) / window.innerHeight
      origin = { x, y }
    }

    confetti({
      particleCount: 80,
      spread: 60,
      origin,
      colors: ['#10b981', '#059669', '#047857', '#065f46'], // Green colors
    })
  }

  function triggerNoConfetti(event?: React.MouseEvent) {
    let origin: { x?: number, y: number } = { y: 0.6 }

    if (event && event.currentTarget) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      const x = (rect.left + rect.width / 2) / window.innerWidth
      const y = (rect.top + rect.height / 2) / window.innerHeight
      origin = { x, y }
    }

    confetti({
      particleCount: 80,
      spread: 60,
      origin,
      colors: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b'], // Red colors
    })
  }

  // Handle confirm trade with loading
  async function handleConfirmTrade() {
    if (!tradingState.amount || Number.parseFloat(tradingState.amount) <= 0 || !tradingState.yesNoSelection) {
      return
    }

    tradingState.setIsLoading(true)
    tradingState.setShowWinCard(false)

    // Simulate API call
    setTimeout(() => {
      tradingState.setIsLoading(false)

      const amountNum = Number.parseFloat(tradingState.amount)

      if (tradingState.activeTab === 'sell') {
        // Sell logic
        const sellValue = calculateSellAmount(amountNum)

        // Show success toast for sell
        toast.success(
          `Sell ${tradingState.amount} shares on ${tradingState.yesNoSelection === 'yes' ? 'Yes' : 'No'}`,
          {
            description: (
              <div>
                <div className="font-medium">{event.title}</div>
                <div className="mt-1 text-xs opacity-80">
                  Received $$
                  {tradingState.formatValue(sellValue)}
                  {' '}
                  @ $
                  {getAvgSellPrice()}
                  ¢
                </div>
              </div>
            ),
          },
        )

        console.log(
          `Sell executed: ${tradingState.formatValue(
            Number.parseFloat(tradingState.amount),
          )} shares on ${tradingState.yesNoSelection} for $${tradingState.formatValue(sellValue)}`,
        )
      }
      else {
        // Buy logic (original)
        const price = tradingState.yesNoSelection === 'yes' ? yesPrice : noPrice
        const shares = tradingState.formatValue((amountNum / price) * 100)

        // Show success toast for buy
        toast.success(
          `Buy $${tradingState.amount} on ${tradingState.yesNoSelection === 'yes' ? 'Yes' : 'No'}`,
          {
            description: (
              <div>
                <div className="font-medium">{event.title}</div>
                <div className="mt-1 text-xs opacity-80">
                  {shares}
                  {' '}
                  shares @
                  {price}
                  ¢
                </div>
              </div>
            ),
          },
        )

        console.log(
          `Buy executed: $${tradingState.amount} on ${tradingState.yesNoSelection} for market ${event.title}`,
        )
      }

      // Reset states
      tradingState.setAmount('')
      // Temporary workaround: displays victory card after 1.5s
      setTimeout(() => tradingState.setShowWinCard(true), 1500)
    }, 1000)
  }

  if (tradingState.showWinCard) {
    return (
      <EventOrderPanelWinCard
        event={event}
        tradingState={tradingState}
        isMobileVersion={isMobileVersion}
      />
    )
  }

  return (
    <EventOrderPanelForm
      event={event}
      tradingState={tradingState}
      isMobileVersion={isMobileVersion}
      handleConfirmTrade={handleConfirmTrade}
      triggerYesConfetti={triggerYesConfetti}
      triggerNoConfetti={triggerNoConfetti}
    />
  )
}
