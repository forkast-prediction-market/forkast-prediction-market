'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { cacheTags } from '@/lib/cache-tags'
import { OrderRepository } from '@/lib/db/queries/order'
import { UserRepository } from '@/lib/db/queries/user'

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

  type: z.union([z.literal(0), z.literal(1)]),
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

  try {
    const clobUrl = `${process.env.CLOB_URL}/order`
    const clobResponse = await fetch(clobUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': process.env.CLOB_API_KEY!,
      },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        order: {
          ...validated.data,
          affiliate_percentage: Number(validated.data.affiliate_percentage),
        },
        order_type: 'GTC',
        owner: process.env.CLOB_API_KEY!,
      }),
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
