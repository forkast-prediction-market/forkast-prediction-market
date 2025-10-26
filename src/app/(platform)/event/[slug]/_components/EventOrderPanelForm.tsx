import type { Event, OrderSide, OrderType } from '@/types'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import Form from 'next/form'
import { toast } from 'sonner'
import { keccak256, stringToBytes } from 'viem'
import { useSignMessage } from 'wagmi'
import { storeOrderAction } from '@/app/(platform)/event/[slug]/_actions/store-order'
import EventOrderPanelBuySellTabs from '@/app/(platform)/event/[slug]/_components/EventOrderPanelBuySellTabs'
import EventOrderPanelEarnings from '@/app/(platform)/event/[slug]/_components/EventOrderPanelEarnings'
import EventOrderPanelInput from '@/app/(platform)/event/[slug]/_components/EventOrderPanelInput'
import EventOrderPanelLimitControls from '@/app/(platform)/event/[slug]/_components/EventOrderPanelLimitControls'
import EventOrderPanelMarketInfo from '@/app/(platform)/event/[slug]/_components/EventOrderPanelMarketInfo'
import EventOrderPanelMobileMarketInfo from '@/app/(platform)/event/[slug]/_components/EventOrderPanelMobileMarketInfo'
import EventOrderPanelOutcomeButton from '@/app/(platform)/event/[slug]/_components/EventOrderPanelOutcomeButton'
import EventOrderPanelSubmitButton from '@/app/(platform)/event/[slug]/_components/EventOrderPanelSubmitButton'
import EventOrderPanelTermsDisclaimer from '@/app/(platform)/event/[slug]/_components/EventOrderPanelTermsDisclaimer'
import EventOrderPanelUserShares from '@/app/(platform)/event/[slug]/_components/EventOrderPanelUserShares'
import { cn, toMicro, triggerConfetti } from '@/lib/utils'
import {
  calculateSellAmount,
  getAvgSellPrice,
  useAmountAsNumber,
  useIsBinaryMarket,
  useNoPrice,
  useOrder,
  useYesPrice,
} from '@/stores/useOrder'
import { useUser } from '@/stores/useUser'

interface EventOrderPanelFormProps {
  isMobile: boolean
  event: Event
}

export default function EventOrderPanelForm({ event, isMobile }: EventOrderPanelFormProps) {
  const { open } = useAppKit()
  const { isConnected } = useAppKitAccount()
  const { signMessage } = useSignMessage()
  const user = useUser()
  const state = useOrder()
  const yesPrice = useYesPrice()
  const noPrice = useNoPrice()
  const isBinaryMarket = useIsBinaryMarket()
  const amount = useAmountAsNumber()
  const isLimitOrder = state.type === 'limit'

  async function storeOrder(payload: any, signature: string) {
    state.setIsLoading(true)

    try {
      const result = await storeOrderAction(payload, signature)

      if (result?.error) {
        toast.error('Trade failed', {
          description: result.error,
        })
        return
      }

      if (state.side === 'sell') {
        const sellValue = calculateSellAmount()

        toast.success(
          `Sell ${state.amount} shares on ${state.outcome!.outcome_text}`,
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
      else { // Buy logic
        toast.success(
          `Buy $${state.amount} on ${state.outcome!.outcome_text}`,
          {
            description: (
              <div>
                <div className="font-medium">{event.title}</div>
                <div className="mt-1 text-xs opacity-80">
                  {amount}
                  {' '}
                  shares 10¢
                </div>
              </div>
            ),
          },
        )
      }

      triggerConfetti(state.outcome!.outcome_index === 0 ? 'yes' : 'no', state.lastMouseEvent)
      state.setAmount('0.00')
    }
    catch {
      toast.error('Trade failed', {
        description: 'An unexpected error occurred. Please try again.',
      })
    }
    finally {
      state.setIsLoading(false)
    }
  }

  async function onSubmit() {
    if (!isConnected || !user) {
      queueMicrotask(() => open())
      return
    }

    if (state.isLoading) {
      return
    }

    if (!state.market || !state.outcome) {
      return
    }

    if (isLimitOrder) {
      const limitPriceValue = Number.parseFloat(state.limitPrice)

      if (!Number.isFinite(limitPriceValue) || limitPriceValue <= 0) {
        toast.error('Enter a valid limit price before submitting.')
        return
      }

      const limitSharesValue = Number.parseFloat(state.limitShares)
      if (!Number.isFinite(limitSharesValue) || limitSharesValue <= 0) {
        toast.error('Enter the number of shares for your limit order.')
        return
      }
    }

    if (amount <= 0) {
      return
    }

    const payload = {
      // begin blockchain data
      salt: 333000003,
      maker: user.address,
      signer: user.address,
      taker: user.address,
      referrer: user.address,
      affiliate: user.address,
      token_id: state.outcome.token_id,
      maker_amount: toMicro(state.amount),
      taker_amount: toMicro(state.amount),
      expiration: 202612232334,
      nonce: 3003,
      fee_rate_bps: 200,
      affiliate_percentage: 0,
      side: state.side === 'buy' ? 0 : 1 as OrderSide,
      signature_type: 0,
      signature: '0x',
      // end blockchain data

      type: state.type === 'market' ? 0 : 1 as OrderType,
      condition_id: state.market.condition_id,
    }

    await storeOrder(payload, 'testing')

    if (false) {
      const message = keccak256(stringToBytes(JSON.stringify(payload)))

      signMessage({ message }, {
        onSuccess: async (signature) => {
          console.log(signature)
        },
      })
    }
  }

  return (
    <Form
      action={onSubmit}
      className={cn({
        'rounded-lg border lg:w-[340px]': !isMobile,
      }, 'w-full p-4 shadow-xl/5 lg:max-w-[340px]')}
    >
      {!isMobile && !isBinaryMarket && <EventOrderPanelMarketInfo />}
      {isMobile && <EventOrderPanelMobileMarketInfo />}

      <EventOrderPanelBuySellTabs />

      <div className="mb-2 flex gap-2">
        <EventOrderPanelOutcomeButton type="yes" price={yesPrice} />
        <EventOrderPanelOutcomeButton type="no" price={noPrice} />
      </div>

      {isLimitOrder
        ? (
            <div className="mb-4">
              <EventOrderPanelLimitControls />
            </div>
          )
        : (
            <>
              {state.side === 'sell' ? <EventOrderPanelUserShares /> : <div className="mb-4"></div>}
              <EventOrderPanelInput isMobile={isMobile} />
              {amount > 0 && <EventOrderPanelEarnings isMobile={isMobile} />}
            </>
          )}

      <EventOrderPanelSubmitButton />
      <EventOrderPanelTermsDisclaimer />
    </Form>
  )
}
