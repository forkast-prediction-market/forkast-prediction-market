'use server'

import { updateTag } from 'next/cache'
import { z } from 'zod'
import { cacheTags } from '@/lib/cache-tags'
import { CLOB_ORDER_TYPE, ORDER_TYPE } from '@/lib/constants'
import { OrderRepository } from '@/lib/db/queries/order'
import { UserRepository } from '@/lib/db/queries/user'
import { toMicro } from '@/lib/formatters'
import { buildClobHmacSignature } from '@/lib/hmac'

const StoreOrderSchema = z.object({
  // begin blockchain data
  salt: z.string(),
  maker: z.string(),
  signer: z.string(),
  taker: z.string(),
  referrer: z.string(),
  affiliate: z.string(),
  token_id: z.string(),
  maker_amount: z.string(),
  taker_amount: z.string(),
  expiration: z.string(),
  nonce: z.string(),
  fee_rate_bps: z.string(),
  affiliate_percentage: z.string(),
  side: z.union([z.literal(0), z.literal(1)]),
  signature_type: z.number(),
  signature: z.string(),
  // end blockchain data

  type: z.union([z.literal(ORDER_TYPE.MARKET), z.literal(ORDER_TYPE.LIMIT)]),
  clob_type: z.nativeEnum(CLOB_ORDER_TYPE).optional(),
  condition_id: z.string(),
  slug: z.string(),
})

type StoreOrderInput = z.infer<typeof StoreOrderSchema>

const DEFAULT_ERROR_MESSAGE = 'Something went wrong while processing your order. Please try again.'

export async function storeOrderAction(payload: StoreOrderInput) {
  const user = await UserRepository.getCurrentUser()
  if (!user) {
    return { error: 'Unauthenticated.' }
  }

  const validated = StoreOrderSchema.safeParse(payload)

  if (!validated.success) {
    return {
      error: validated.error.issues[0].message,
    }
  }

  const clobOrderType = validated.data.clob_type
    ?? (validated.data.type === ORDER_TYPE.MARKET
      ? user.settings.trading.market_order_type
      : CLOB_ORDER_TYPE.GTC)

  try {
    const clobPayload = {
      order: {
        salt: validated.data.salt,
        maker: validated.data.maker,
        signer: validated.data.signer,
        taker: validated.data.taker,
        referrer: validated.data.referrer,
        affiliate: validated.data.affiliate,
        conditionId: validated.data.condition_id,
        tokenId: validated.data.token_id,
        makerAmount: validated.data.maker_amount,
        takerAmount: validated.data.taker_amount,
        expiration: validated.data.expiration,
        nonce: validated.data.nonce,
        feeRateBps: validated.data.fee_rate_bps,
        affiliatePercentage: Number(validated.data.affiliate_percentage),
        side: validated.data.side === 0 ? 'BUY' : 'SELL',
        signatureType: validated.data.signature_type,
        signature: validated.data.signature,
      },
      orderType: clobOrderType,
      owner: process.env.FORKAST_ADDRESS!,
    }

    const method = 'POST'
    const path = '/order'
    const body = JSON.stringify(clobPayload)
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = buildClobHmacSignature(
      process.env.FORKAST_API_SECRET!,
      timestamp,
      method,
      path,
      body,
    )

    const clobStoreOrderResponse = await fetch(`${process.env.CLOB_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'FORKAST_ADDRESS': process.env.FORKAST_ADDRESS!,
        'FORKAST_API_KEY': process.env.FORKAST_API_KEY!,
        'FORKAST_PASSPHRASE': process.env.FORKAST_PASSPHRASE!,
        'FORKAST_TIMESTAMP': timestamp.toString(),
        'FORKAST_SIGNATURE': signature,
      },
      body,
      signal: AbortSignal.timeout(5000),
    })

    const clobStoreOrderResponseJson = await clobStoreOrderResponse.json()

    if (clobStoreOrderResponse.status !== 201) {
      if (clobStoreOrderResponse.status === 200) {
        return { error: clobStoreOrderResponseJson.errorMsg }
      }

      const message = `Status ${clobStoreOrderResponse.status} (${clobStoreOrderResponse.statusText})`
      console.error('Failed to send order to CLOB.', message)
      return { error: DEFAULT_ERROR_MESSAGE }
    }

    fetch(`${process.env.CLOB_URL}/data/order/${clobStoreOrderResponseJson.orderId}`)
      .then(res => res.json())
      .then((res) => {
        OrderRepository.createOrder({
          ...validated.data,
          salt: BigInt(validated.data.salt),
          maker_amount: BigInt(validated.data.maker_amount),
          taker_amount: BigInt(validated.data.taker_amount),
          nonce: BigInt(validated.data.nonce),
          fee_rate_bps: Number(validated.data.fee_rate_bps),
          affiliate_percentage: Number(validated.data.affiliate_percentage),
          expiration: BigInt(validated.data.expiration),
          user_id: user.id,
          affiliate_user_id: user.referred_by_user_id,
          type: clobOrderType,
          status: res.order.status,
          clob_order_id: res.order.id,
          size_matched: BigInt(toMicro(res.order.sizeMatched)),
        })
      })
      .catch((err) => {
        console.error('Failed to get order from CLOB.', err.message)
      })

    updateTag(cacheTags.activity(validated.data.slug))
    updateTag(cacheTags.holders(validated.data.condition_id))
  }
  catch (error) {
    console.error('Failed to create order.', error)
    return { error: DEFAULT_ERROR_MESSAGE }
  }
}
