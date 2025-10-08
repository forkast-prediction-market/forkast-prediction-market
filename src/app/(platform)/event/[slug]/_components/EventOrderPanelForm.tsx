import type { Event } from '@/types'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import Form from 'next/form'
import { toast } from 'sonner'
import EventOrderPanelBuySellTabs from '@/app/(platform)/event/[slug]/_components/EventOrderPanelBuySellTabs'
import EventOrderPanelEarnings from '@/app/(platform)/event/[slug]/_components/EventOrderPanelEarnings'
import EventOrderPanelInput from '@/app/(platform)/event/[slug]/_components/EventOrderPanelInput'
import EventOrderPanelMarketInfo from '@/app/(platform)/event/[slug]/_components/EventOrderPanelMarketInfo'
import EventOrderPanelMobileMarketInfo from '@/app/(platform)/event/[slug]/_components/EventOrderPanelMobileMarketInfo'
import EventOrderPanelOutcomeButton from '@/app/(platform)/event/[slug]/_components/EventOrderPanelOutcomeButton'
import EventOrderPanelSubmitButton from '@/app/(platform)/event/[slug]/_components/EventOrderPanelSubmitButton'
import EventOrderPanelTermsDisclaimer from '@/app/(platform)/event/[slug]/_components/EventOrderPanelTermsDisclaimer'
import EventOrderPanelUserShares from '@/app/(platform)/event/[slug]/_components/EventOrderPanelUserShares'
import { storeOrderAction } from '@/app/(platform)/event/[slug]/actions/store-order'
import { cn, triggerConfetti } from '@/lib/utils'
import {
  calculateSellAmount,
  getAvgSellPrice,
  getUserShares,
  useAmountAsNumber,
  useIsBinaryMarket,
  useNoPrice,
  useOrder,
  useYesPrice,
} from '@/stores/useOrder'

interface Props {
  isMobile: boolean
  event: Event
}

export default function EventOrderPanelForm({ event, isMobile }: Props) {
  const { open } = useAppKit()
  const { isConnected } = useAppKitAccount()
  const state = useOrder()
  const yesPrice = useYesPrice()
  const noPrice = useNoPrice()
  const isBinaryMarket = useIsBinaryMarket()
  const amount = useAmountAsNumber()

  async function onSubmit() {
    if (!isConnected) {
      queueMicrotask(() => open())
      return
    }

    if (state.isLoading) {
      return
    }

    if (!state.market || !state.outcome) {
      return
    }

    if (amount <= 0) {
      return
    }

    state.setIsLoading(true)

    try {
      const price = state.outcome.outcome_index === 0 ? yesPrice : noPrice

      const orderPayload = {
        slug: event.slug,
        condition_id: state.market.condition_id,
        token_id: state.outcome.token_id,
        side: state.side,
        amount,
        type: 'market' as const,
        price: price / 100,
      }

      const result = await storeOrderAction(orderPayload)

      if (result?.error) {
        toast.error('Trade failed', {
          description: result.error,
        })
        return
      }

      if (state.side === 'sell') {
        const sellValue = calculateSellAmount()

        toast.success(
          `Sell ${state.amount} shares on ${state.outcome.outcome_text}`,
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
        const shares = ((amount / price) * 100).toFixed(2)

        toast.success(
          `Buy $${state.amount} on ${state.outcome.outcome_text}`,
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

      triggerConfetti(state.outcome.outcome_index === 0 ? 'yes' : 'no', state.lastMouseEvent)
      state.setAmount('0.00')
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

  return (
    <Form
      action={onSubmit}
      className={cn({
        'rounded-lg border lg:w-[320px]': !isMobile,
      }, 'w-full p-4 shadow-xl/5')}
    >
      {!isMobile && !isBinaryMarket && <EventOrderPanelMarketInfo />}
      {isMobile && <EventOrderPanelMobileMarketInfo />}

      <EventOrderPanelBuySellTabs />

      <div className="mb-2 flex gap-2">
        <EventOrderPanelOutcomeButton type="yes" price={yesPrice} />
        <EventOrderPanelOutcomeButton type="no" price={noPrice} />
      </div>

      {state.side === 'sell' ? <EventOrderPanelUserShares /> : <div className="mb-4"></div>}

      <EventOrderPanelInput isMobile={isMobile} getUserShares={getUserShares} />

      {amount > 0 && <EventOrderPanelEarnings isMobile={isMobile} />}

      <EventOrderPanelSubmitButton />
      <EventOrderPanelTermsDisclaimer />
    </Form>
  )
}
