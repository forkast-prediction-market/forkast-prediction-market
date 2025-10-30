import type { Event } from '@/types'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import Form from 'next/form'
import { toast } from 'sonner'
import { useSignTypedData } from 'wagmi'
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
import { defaultNetwork } from '@/lib/appkit'
import { ORDER_SIDE, OUTCOME_INDEX } from '@/lib/constants'
import { cn, toMicro, triggerConfetti } from '@/lib/utils'
import {
  calculateSellAmount,
  getAvgSellPrice,
  useAmountAsNumber,
  useIsBinaryMarket,
  useIsLimitOrder,
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
  const { signTypedDataAsync } = useSignTypedData()
  const user = useUser()
  const state = useOrder()
  const yesPrice = useYesPrice()
  const noPrice = useNoPrice()
  const isBinaryMarket = useIsBinaryMarket()
  const amount = useAmountAsNumber()
  const isLimitOrder = useIsLimitOrder()

  async function storeOrder(payload: any) {
    state.setIsLoading(true)

    try {
      const result = await storeOrderAction(payload)

      if (result?.error) {
        toast.error('Trade failed', {
          description: result.error,
        })
        return
      }

      if (state.side === ORDER_SIDE.SELL) {
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

      triggerConfetti(state.outcome!.outcome_index === OUTCOME_INDEX.YES ? 'yes' : 'no', state.lastMouseEvent)
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

  async function sign(payload: any) {
    return await signTypedDataAsync({
      domain: {
        name: 'Forkast CLOB',
        version: '1',
        chainId: defaultNetwork.id,
      },
      types: {
        Order: [
          { name: 'salt', type: 'uint256' },
          { name: 'maker', type: 'address' },
          { name: 'signer', type: 'address' },
          { name: 'taker', type: 'address' },
          { name: 'referrer', type: 'address' },
          { name: 'affiliate', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'makerAmount', type: 'uint256' },
          { name: 'takerAmount', type: 'uint256' },
          { name: 'expiration', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'feeRateBps', type: 'uint256' },
          { name: 'affiliatePercentage', type: 'uint256' },
          { name: 'side', type: 'uint8' },
          { name: 'signatureType', type: 'uint8' },
        ],
      },
      primaryType: 'Order',
      message: {
        salt: BigInt(payload.salt),
        maker: payload.maker as `0x${string}`,
        signer: payload.signer as `0x${string}`,
        taker: payload.taker as `0x${string}`,
        referrer: payload.referrer as `0x${string}`,
        affiliate: payload.affiliate as `0x${string}`,
        tokenId: BigInt(payload.token_id),
        makerAmount: BigInt(payload.maker_amount),
        takerAmount: BigInt(payload.taker_amount),
        expiration: BigInt(payload.expiration),
        nonce: BigInt(payload.nonce),
        feeRateBps: BigInt(payload.fee_rate_bps),
        affiliatePercentage: BigInt(payload.affiliate_percentage),
        side: payload.side,
        signatureType: payload.signature_type,
      },
    })
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
      side: state.side,
      signature_type: 0,
      signature: '0x',
      // end blockchain data

      type: state.type,
      condition_id: state.market.condition_id,
    }

    const signature = await sign(payload)
    await storeOrder({
      ...payload,
      signature,
    })
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
              {state.side === ORDER_SIDE.SELL ? <EventOrderPanelUserShares /> : <div className="mb-4"></div>}
              <EventOrderPanelInput isMobile={isMobile} />
              {amount > 0 && <EventOrderPanelEarnings isMobile={isMobile} />}
            </>
          )}

      <EventOrderPanelSubmitButton />
      <EventOrderPanelTermsDisclaimer />
    </Form>
  )
}
