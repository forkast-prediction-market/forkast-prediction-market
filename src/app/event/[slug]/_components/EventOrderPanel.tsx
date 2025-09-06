import type { Event } from '@/types'
import { toast } from 'sonner'
import EventOrderPanelForm from '@/app/event/[slug]/_components/EventOrderPanelForm'
import { storeOrderAction } from '@/app/event/[slug]/actions/store-order'
import { calculateSellAmount, getAvgSellPrice, useNoPrice, useOrder, useYesPrice } from '@/stores/useOrder'

interface EventProps {
  event: Event
  isMobile: boolean
}

export default function EventOrderPanel({ event, isMobile }: EventProps) {
  const state = useOrder()
  const yesPrice = useYesPrice()
  const noPrice = useNoPrice()

  // Handle confirm trade with loading
  async function handleConfirmTrade() {
    if (!state.market || !state.outcome) {
      return
    }

    if (Number.parseFloat(state.amount) <= 0) {
      return
    }

    state.setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('condition_id', state.market.condition_id)
      formData.append('slug', event.slug)
      formData.append('side', state.activeTab)
      formData.append('amount', state.amount)
      formData.append('order_type', 'market')
      formData.append('outcome_index', state.outcome.outcome_index.toString())
      const price = state.outcome.outcome_index === 0 ? yesPrice : noPrice
      formData.append('price', (price / 100).toString())

      // Call the server action
      const result = await storeOrderAction(formData)

      if (result?.error) {
        toast.error('Trade failed', {
          description: result.error,
        })
        return
      }

      // Success - show appropriate toast
      const amountNum = Number.parseFloat(state.amount)

      if (state.activeTab === 'sell') {
        const sellValue = calculateSellAmount(amountNum)

        toast.success(
          `Sell ${state.amount} shares on ${state.outcome.outcome_index === 0 ? 'Yes' : 'No'}`,
          {
            description: (
              <div>
                <div className="font-medium">{event.title}</div>
                <div className="mt-1 text-xs opacity-80">
                  Received $
                  {sellValue.toFixed(2)}
                  {' '}
                  @ $
                  {getAvgSellPrice()}
                  ¢
                </div>
              </div>
            ),
          },
        )
      }
      else {
        // Buy logic
        const price = state.outcome.outcome_index === 0 ? yesPrice : noPrice
        const shares = ((amountNum / price) * 100).toFixed(2)

        toast.success(
          `Buy $${state.amount} on ${state.outcome.outcome_index === 0 ? 'Yes' : 'No'}`,
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
      }

      state.setAmount('')
    }
    catch (error) {
      console.error('Trade error:', error)
      toast.error('Trade failed', {
        description: 'An unexpected error occurred. Please try again.',
      })
    }
    finally {
      state.setIsLoading(false)
    }
  }

  return <EventOrderPanelForm event={event} isMobile={isMobile} handleConfirmTrade={handleConfirmTrade} />
}
