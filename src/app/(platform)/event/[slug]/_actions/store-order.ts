'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { cacheTags } from '@/lib/cache-tags'
import { CLOB_ORDER_TYPE, ORDER_TYPE } from '@/lib/constants'
import { OrderRepository } from '@/lib/db/queries/order'
import { UserRepository } from '@/lib/db/queries/user'
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

  const clobOrderType = validated.data.type === ORDER_TYPE.MARKET
    ? user.settings.trading.market_order_type
    : CLOB_ORDER_TYPE.GTC

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

    const clobResponse = await fetch(`${process.env.CLOB_URL}${path}`, {
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

    const text = await clobResponse.text()
    const data = (() => {
      try {
        return JSON.parse(text)
      }
      catch {
        return null
      }
    })()

    if (!clobResponse.ok) {
      const message = data?.error || text || `Status ${clobResponse.status} (${clobResponse.statusText})`
      console.error('Failed to send order to CLOB.', message)
      return { error: DEFAULT_ERROR_MESSAGE }
    }

    const { error } = await OrderRepository.createOrder({
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
    })

    if (error) {
      console.error('Failed to create order.', error)
      return { error: DEFAULT_ERROR_MESSAGE }
    }

    revalidateTag(cacheTags.activity(validated.data.slug), 'max')
  }
  catch (error) {
    console.error('Failed to create order.', error)
    return { error: DEFAULT_ERROR_MESSAGE }
  }
}
