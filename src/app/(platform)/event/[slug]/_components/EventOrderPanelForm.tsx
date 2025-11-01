import type { BlockchainOrder, Event, OrderSide } from '@/types'
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
import { CAP_MICRO, FLOOR_MICRO, ORDER_SIDE, OUTCOME_INDEX } from '@/lib/constants'
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

  async function storeOrder(payload: BlockchainOrder & { signature: string }) {
    state.setIsLoading(true)

    try {
      const result = await storeOrderAction({
        ...payload,
        salt: payload.salt.toString(),
        token_id: payload.token_id.toString(),
        maker_amount: payload.maker_amount.toString(),
        taker_amount: payload.taker_amount.toString(),
        expiration: payload.expiration.toString(),
        nonce: payload.nonce.toString(),
        fee_rate_bps: payload.fee_rate_bps.toString(),
        affiliate_percentage: payload.affiliate_percentage.toString(),
        side: payload.side as OrderSide,
        type: state.type,
        condition_id: state.market!.condition_id,
        slug: event.slug,
      })

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

  async function sign(payload: BlockchainOrder) {
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
        salt: payload.salt,
        maker: payload.maker,
        signer: payload.signer,
        taker: payload.taker,
        referrer: payload.referrer,
        affiliate: payload.affiliate,
        tokenId: payload.token_id,
        makerAmount: payload.maker_amount,
        takerAmount: payload.taker_amount,
        expiration: payload.expiration,
        nonce: payload.nonce,
        feeRateBps: payload.fee_rate_bps,
        affiliatePercentage: payload.affiliate_percentage,
        side: payload.side,
        signatureType: payload.signature_type,
      },
    })
  }

  async function onSubmit() {
    let makerAmount = 0n
    let takerAmount = 0n

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

    if (amount <= 0) {
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

      const priceMicro = BigInt(toMicro(state.limitPrice))
      const sharesMicro = BigInt(toMicro(state.limitShares))

      if (state.side === ORDER_SIDE.BUY) {
        makerAmount = (priceMicro * sharesMicro) / 1_000_000n
        takerAmount = sharesMicro
      }
      else {
        makerAmount = sharesMicro
        takerAmount = (priceMicro * sharesMicro) / 1_000_000n
      }
    }
    else {
      makerAmount = BigInt(toMicro(state.amount))

      if (state.side === ORDER_SIDE.BUY) {
        takerAmount = makerAmount * 1_000_000n / CAP_MICRO
      }
      else {
        takerAmount = FLOOR_MICRO * makerAmount / 1_000_000n
      }
    }

    const payload: BlockchainOrder = {
      salt: 333000003n,
      maker: user.address as `0x${string}`,
      signer: user.address as `0x${string}`,
      taker: user.address as `0x${string}`,
      referrer: user.address as `0x${string}`,
      affiliate: user.address as `0x${string}`,
      token_id: BigInt(state.outcome.token_id),
      maker_amount: makerAmount,
      taker_amount: takerAmount,
      expiration: 1764548576n,
      nonce: 3003n,
      fee_rate_bps: 200n,
      affiliate_percentage: 0n,
      side: state.side,
      signature_type: 0,
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
      }, 'w-full p-4 shadow-xl/5')}
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
