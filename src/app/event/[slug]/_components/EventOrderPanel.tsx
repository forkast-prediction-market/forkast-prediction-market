import type { Event } from '@/types'
import { toast } from 'sonner'
import { storeOrderAction } from '@/app/event/[slug]/actions/store-order'
import EventOrderPanelForm from './EventOrderPanelForm'

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

  // Handle confirm trade with loading
  async function handleConfirmTrade() {
    if (!tradingState.amount || Number.parseFloat(tradingState.amount) <= 0 || !tradingState.yesNoSelection) {
      return
    }

    tradingState.setIsLoading(true)

    try {
      // Prepare FormData for the server action
      const formData = new FormData()
      formData.append('condition_id', event.condition_id)
      formData.append('slug', event.slug)
      formData.append('side', tradingState.activeTab)
      formData.append('amount', tradingState.amount)
      formData.append('order_type', 'market')

      // Determine outcome_index based on selection
      let outcomeIndex = 0
      if (tradingState.isMultiMarket && tradingState.selectedOutcomeForOrder) {
        const selectedOutcome = getSelectedOutcome()
        outcomeIndex = selectedOutcome?.outcome_index || 0
      }
      else {
        // Binary market: 0 for yes, 1 for no
        outcomeIndex = tradingState.yesNoSelection === 'yes' ? 0 : 1
      }
      formData.append('outcome_index', outcomeIndex.toString())

      // Add price (use current market price)
      const price = tradingState.yesNoSelection === 'yes' ? yesPrice : noPrice
      formData.append('price', (price / 100).toString()) // Convert cents to dollars

      // Call the server action
      const result = await storeOrderAction(formData)

      if (result?.error) {
        toast.error('Trade failed', {
          description: result.error,
        })
        return
      }

      // Success - show appropriate toast
      const amountNum = Number.parseFloat(tradingState.amount)

      if (tradingState.activeTab === 'sell') {
        // Sell logic
        const sellValue = calculateSellAmount(amountNum)

        toast.success(
          `Sell ${tradingState.amount} shares on ${tradingState.yesNoSelection === 'yes' ? 'Yes' : 'No'}`,
          {
            description: (
              <div>
                <div className="font-medium">{event.title}</div>
                <div className="mt-1 text-xs opacity-80">
                  Received $
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
        // Buy logic
        const price = tradingState.yesNoSelection === 'yes' ? yesPrice : noPrice
        const shares = tradingState.formatValue((amountNum / price) * 100)

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
    }
    catch (error) {
      console.error('Trade error:', error)
      toast.error('Trade failed', {
        description: 'An unexpected error occurred. Please try again.',
      })
    }
    finally {
      tradingState.setIsLoading(false)
    }
  }

  return (
    <EventOrderPanelForm
      event={event}
      tradingState={tradingState}
      isMobileVersion={isMobileVersion}
      handleConfirmTrade={handleConfirmTrade}
    />
  )
}
