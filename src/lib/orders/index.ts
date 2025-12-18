import type { CLOB_ORDER_TYPE } from '@/lib/constants'
import type { BlockchainOrder, OrderSide, OrderType, Outcome } from '@/types'
import { storeOrderAction } from '@/app/(platform)/event/[slug]/_actions/store-order'
import { CAP_MICRO, FLOOR_MICRO, ORDER_SIDE, ORDER_TYPE } from '@/lib/constants'
import { ZERO_ADDRESS } from '@/lib/contracts'
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
  referrerAddress?: `0x${string}`
  affiliateAddress?: `0x${string}`
  affiliateSharePercent?: number
  makerAddress?: `0x${string}`
  signatureType?: number
  feeRateBps?: number
  expirationTimestamp?: number
}

export interface SubmitOrderArgs {
  order: BlockchainOrder
  signature: string
  orderType: OrderType
  clobOrderType?: keyof typeof CLOB_ORDER_TYPE
  conditionId: string
  slug: string
}

const DEFAULT_ORDER_FIELDS = {
  salt: 0n,
  expiration: 1767195000n,
  nonce: 0n,
  fee_rate_bps: 200n,
  affiliate_percentage: 0n,
  signature_type: 0,
} as const

function generateOrderSalt() {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined

  if (cryptoObj?.getRandomValues) {
    const buffer = new Uint32Array(2)
    cryptoObj.getRandomValues(buffer)

    let value = 0n
    buffer.forEach((segment) => {
      value = (value << 32n) + BigInt(segment)
    })

    if (value > 0n) {
      return value
    }
  }

  const fallback = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
  return BigInt(fallback || Date.now())
}

export function calculateOrderAmounts({ orderType, side, amount, limitPrice, limitShares }: CalculateOrderAmountsArgs) {
  let makerAmount: bigint
  let takerAmount: bigint

  if (orderType === ORDER_TYPE.LIMIT) {
    const normalizedLimitPrice = (Number.parseFloat(limitPrice) || 0) / 100
    const priceMicro = BigInt(toMicro(normalizedLimitPrice))
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

export function buildOrderPayload({
  userAddress,
  outcome,
  referrerAddress,
  affiliateAddress,
  affiliateSharePercent,
  makerAddress,
  signatureType,
  feeRateBps,
  expirationTimestamp,
  ...rest
}: BuildOrderPayloadArgs): BlockchainOrder {
  const { makerAmount, takerAmount } = calculateOrderAmounts(rest)
  const salt = generateOrderSalt()
  const normalizedReferrer = normalizeAddress(referrerAddress)
  const normalizedAffiliate = normalizeAddress(affiliateAddress)
  const fallbackReferrer = normalizeAddress(process.env.NEXT_PUBLIC_FEE_RECIPIENT_WALLET) ?? ZERO_ADDRESS
  const affiliatePercentageValue = normalizedAffiliate && normalizedAffiliate !== ZERO_ADDRESS
    ? BigInt(Math.max(0, Math.trunc(affiliateSharePercent ?? 0)))
    : 0n
  const maker = makerAddress ?? userAddress
  const signatureTypeValue = typeof signatureType === 'number' ? signatureType : DEFAULT_ORDER_FIELDS.signature_type
  const feeRateBpsValue = typeof feeRateBps === 'number' && Number.isFinite(feeRateBps)
    ? BigInt(Math.max(0, Math.trunc(feeRateBps)))
    : DEFAULT_ORDER_FIELDS.fee_rate_bps
  const expirationValue = typeof expirationTimestamp === 'number' && Number.isFinite(expirationTimestamp)
    ? BigInt(Math.max(0, Math.trunc(expirationTimestamp)))
    : DEFAULT_ORDER_FIELDS.expiration

  return {
    ...DEFAULT_ORDER_FIELDS,
    salt,
    maker,
    signer: userAddress,
    taker: ZERO_ADDRESS,
    referrer: normalizedReferrer ?? fallbackReferrer,
    affiliate: normalizedAffiliate ?? ZERO_ADDRESS,
    token_id: BigInt(outcome.token_id),
    maker_amount: makerAmount,
    taker_amount: takerAmount,
    expiration: expirationValue,
    side: rest.side,
    fee_rate_bps: feeRateBpsValue,
    affiliate_percentage: affiliatePercentageValue,
    signature_type: signatureTypeValue,
  }
}

function normalizeAddress(address?: string | null): `0x${string}` | null {
  if (typeof address !== 'string') {
    return null
  }

  const trimmed = address.trim()
  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
    return null
  }

  return trimmed as `0x${string}`
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

export async function submitOrder({
  order,
  signature,
  orderType,
  clobOrderType,
  conditionId,
  slug,
}: SubmitOrderArgs) {
  return storeOrderAction({
    ...serializeOrder(order),
    side: order.side as OrderSide,
    signature,
    type: orderType,
    clob_type: clobOrderType,
    condition_id: conditionId,
    slug,
  })
}
