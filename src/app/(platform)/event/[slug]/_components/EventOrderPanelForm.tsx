import type { BlockchainOrder, Event, OrderSide, UserMarketOutcomePosition } from '@/types'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Form from 'next/form'
import { useEffect } from 'react'
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
import EventTradeToast from '@/app/(platform)/event/[slug]/_components/EventTradeToast'
import { CAP_MICRO, EIP712_DOMAIN, EIP712_TYPES, FLOOR_MICRO, ORDER_SIDE, OUTCOME_INDEX } from '@/lib/constants'
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
  const { open, close } = useAppKit()
  const { isConnected, embeddedWalletInfo } = useAppKitAccount()
  const { signTypedDataAsync } = useSignTypedData()
  const user = useUser()
  const state = useOrder()
  const setUserShares = useOrder(store => store.setUserShares)
  const queryClient = useQueryClient()
  const yesPrice = useYesPrice()
  const noPrice = useNoPrice()
  const isBinaryMarket = useIsBinaryMarket()
  const amount = useAmountAsNumber()
  const isLimitOrder = useIsLimitOrder()

  const { data: userOutcomePositions } = useQuery<UserMarketOutcomePosition[]>({
    queryKey: ['user-event-positions', event.slug, user?.id],
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const response = await fetch(`/api/events/${event.slug}/user-positions`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Failed to load user positions.')
      }

      const payload = await response.json()
      return (payload.data ?? []) as UserMarketOutcomePosition[]
    },
  })

  useEffect(() => {
    if (!user?.id) {
      setUserShares({})
      return
    }

    if (!userOutcomePositions) {
      setUserShares({})
      return
    }

    const sharesByCondition = userOutcomePositions.reduce<Record<string, { [OUTCOME_INDEX.YES]: number, [OUTCOME_INDEX.NO]: number }>>((acc, position) => {
      const rawMicro = typeof position.shares_micro === 'string'
        ? Number(position.shares_micro)
        : Number(position.shares_micro || 0)

      if (!Number.isFinite(rawMicro)) {
        return acc
      }

      const decimalShares = Number((rawMicro / 1_000_000).toFixed(4))
      if (decimalShares <= 0) {
        return acc
      }

      if (!acc[position.condition_id]) {
        acc[position.condition_id] = {
          [OUTCOME_INDEX.YES]: 0,
          [OUTCOME_INDEX.NO]: 0,
        }
      }

      const outcomeKey = position.outcome_index === OUTCOME_INDEX.NO
        ? OUTCOME_INDEX.NO
        : OUTCOME_INDEX.YES

      acc[position.condition_id][outcomeKey] = decimalShares
      return acc
    }, {})

    setUserShares(sharesByCondition)
  }, [user?.id, userOutcomePositions, setUserShares])

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

      triggerToast()
      triggerConfetti(state.outcome!.outcome_index === OUTCOME_INDEX.YES ? 'yes' : 'no', state.lastMouseEvent)
      state.setAmount('0.00')
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: ['user-event-positions', event.slug, user.id],
        })
      }
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
    let shouldCloseModal = false

    if (!embeddedWalletInfo) {
      try {
        await open({ view: 'ApproveTransaction' })
        shouldCloseModal = true
        toast.info('Approve the transaction on your wallet.')
      }
      catch {
        shouldCloseModal = false
      }
    }

    try {
      return await signTypedDataAsync({
        domain: EIP712_DOMAIN,
        types: EIP712_TYPES,
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
    finally {
      if (shouldCloseModal) {
        try {
          await close()
        }
        catch {}
      }
    }
  }

  function validateOrder(): boolean {
    if (state.isLoading) {
      return false
    }

    if (!isConnected || !user) {
      queueMicrotask(() => open())
      return false
    }

    if (!state.market || !state.outcome) {
      toast.error('Market not available', {
        description: 'Please select a valid market and outcome.',
      })

      return false
    }

    if (amount <= 0) {
      toast.error('Invalid amount', {
        description: 'Please enter an amount greater than 0.',
      })

      return false
    }

    if (isLimitOrder) {
      const limitPriceValue = Number.parseFloat(state.limitPrice)
      if (!Number.isFinite(limitPriceValue) || limitPriceValue <= 0) {
        toast.error('Invalid limit price', {
          description: 'Enter a valid limit price before submitting.',
        })

        return false
      }

      const limitSharesValue = Number.parseFloat(state.limitShares)
      if (!Number.isFinite(limitSharesValue) || limitSharesValue <= 0) {
        toast.error('Invalid shares', {
          description: 'Enter the number of shares for your limit order.',
        })

        return false
      }
    }

    return true
  }

  function buildOrderPayload(): BlockchainOrder | null {
    if (!state.market || !state.outcome || !user) {
      return null
    }

    const { makerAmount, takerAmount } = calculateOrderAmounts()

    return {
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
  }

  function calculateOrderAmounts(): { makerAmount: bigint, takerAmount: bigint } {
    let makerAmount: bigint
    let takerAmount: bigint

    if (isLimitOrder) {
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

    return { makerAmount, takerAmount }
  }

  function triggerToast() {
    if (state.side === ORDER_SIDE.SELL) {
      const sellValue = calculateSellAmount()

      toast.success(
        `Sell ${state.amount} shares on ${state.outcome!.outcome_text}`,
        {
          description: (
            <EventTradeToast title={event.title}>
              Received $
              {sellValue.toFixed(2)}
              {' '}
              @ $
              {getAvgSellPrice()}
              ¢
            </EventTradeToast>
          ),
        },
      )
    }
    else {
      toast.success(
        `Buy $${state.amount} on ${state.outcome!.outcome_text}`,
        {
          description: (
            <EventTradeToast title={event.title}>
              {state.amount}
              {' '}
              shares 10¢
            </EventTradeToast>
          ),
        },
      )
    }
  }

  async function onSubmit() {
    const valid = validateOrder()
    if (!valid) {
      return
    }

    const payload = buildOrderPayload()
    if (!payload) {
      return
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
