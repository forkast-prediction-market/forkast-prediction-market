import type { BlockchainOrder, OrderSide, OrderType, Outcome } from '@/types'
import { storeOrderAction } from '@/app/(platform)/event/[slug]/_actions/store-order'
import { CAP_MICRO, FLOOR_MICRO, ORDER_SIDE, ORDER_TYPE } from '@/lib/constants'
import { toMicro } from '@/lib/formatters'

export interface CalculateOrderAmountsArgs {
  orderType: OrderType
  side: OrderSide
  amount: string
  limitPrice: string
  limitShares: string
}

export interface BuildOrderPayloadArgs extends CalculateOrderAmountsArgs {
  userAddress: `0x${string}`
  outcome: Outcome
}

export interface SubmitOrderArgs {
  order: BlockchainOrder
  signature: string
  orderType: OrderType
  conditionId: string
  slug: string
}

const DEFAULT_ORDER_FIELDS = {
  salt: 333000003n,
  expiration: 1764548576n,
  nonce: 3003n,
  fee_rate_bps: 200n,
  affiliate_percentage: 0n,
  signature_type: 0,
} as const

export function calculateOrderAmounts({ orderType, side, amount, limitPrice, limitShares }: CalculateOrderAmountsArgs) {
  let makerAmount: bigint
  let takerAmount: bigint

  if (orderType === ORDER_TYPE.LIMIT) {
    const priceMicro = BigInt(toMicro(limitPrice))
    const sharesMicro = BigInt(toMicro(limitShares))

    if (side === ORDER_SIDE.BUY) {
      makerAmount = (priceMicro * sharesMicro) / 1_000_000n
      takerAmount = sharesMicro
    }
    else {
      makerAmount = sharesMicro
      takerAmount = (priceMicro * sharesMicro) / 1_000_000n
    }
  }
  else {
    makerAmount = BigInt(toMicro(amount))
    if (side === ORDER_SIDE.BUY) {
      takerAmount = makerAmount * 1_000_000n / CAP_MICRO
    }
    else {
      takerAmount = FLOOR_MICRO * makerAmount / 1_000_000n
    }
  }

  return { makerAmount, takerAmount }
}

export function buildOrderPayload({ userAddress, outcome, ...rest }: BuildOrderPayloadArgs): BlockchainOrder {
  const { makerAmount, takerAmount } = calculateOrderAmounts(rest)

  return {
    ...DEFAULT_ORDER_FIELDS,
    maker: userAddress,
    signer: userAddress,
    taker: userAddress,
    referrer: userAddress,
    affiliate: userAddress,
    token_id: BigInt(outcome.token_id),
    maker_amount: makerAmount,
    taker_amount: takerAmount,
    side: rest.side,
  }
}

function serializeOrder(order: BlockchainOrder) {
  return {
    ...order,
    salt: order.salt.toString(),
    token_id: order.token_id.toString(),
    maker_amount: order.maker_amount.toString(),
    taker_amount: order.taker_amount.toString(),
    expiration: order.expiration.toString(),
    nonce: order.nonce.toString(),
    fee_rate_bps: order.fee_rate_bps.toString(),
    affiliate_percentage: order.affiliate_percentage.toString(),
  }
}

export async function submitOrder({ order, signature, orderType, conditionId, slug }: SubmitOrderArgs) {
  return storeOrderAction({
    ...serializeOrder(order),
    side: order.side as OrderSide,
    signature,
    type: orderType,
    condition_id: conditionId,
    slug,
  })
}
