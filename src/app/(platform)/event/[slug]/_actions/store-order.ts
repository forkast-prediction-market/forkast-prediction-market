'use server'

import { z } from 'zod'
import { OrderRepository } from '@/lib/db/queries/order'
import { UserRepository } from '@/lib/db/queries/user'

const StoreOrderSchema = z.object({
  // begin blockchain data
  salt: z.number(),
  maker: z.string(),
  signer: z.string(),
  taker: z.string(),
  referrer: z.string(),
  affiliate: z.string(),
  token_id: z.string(),
  maker_amount: z.string(),
  taker_amount: z.string(),
  expiration: z.number(),
  nonce: z.number(),
  fee_rate_bps: z.number(),
  affiliate_percentage: z.number(),
  side: z.union([z.literal(0), z.literal(1)]),
  signature_type: z.number(),
  signature: z.string(),
  // end blockchain data

  type: z.union([z.literal(0), z.literal(1)]),
  condition_id: z.string(),
})

type StoreOrderInput = z.infer<typeof StoreOrderSchema>

const DEFAULT_ERROR_MESSAGE = 'Something went wrong while processing your order. Please try again.'

export async function storeOrderAction(payload: StoreOrderInput, _: string) {
  const user = await UserRepository.getCurrentUser()
  if (!user) {
    return { error: 'Unauthenticated.' }
  }

  const validated = StoreOrderSchema.safeParse(payload)

  if (!validated.success) {
    console.log(validated.error.issues)
    return {
      error: validated.error.issues[0].message,
    }
  }

  try {
    const clobUrl = `${process.env.CLOB_URL}/v1/orders`
    const clobResponse = await fetch(clobUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': process.env.CLOB_API_KEY!,
      },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        ...validated.data,
      }),
    })

    if (!clobResponse.ok) {
      const json = await clobResponse.json()
      console.error('Failed to send order to CLOB.', json)
      return json
    }

    const { error } = await OrderRepository.createOrder({
      ...validated.data,
      salt: BigInt(validated.data.salt),
      maker_amount: BigInt(validated.data.maker_amount),
      taker_amount: BigInt(validated.data.taker_amount),
      nonce: BigInt(validated.data.nonce),
      expiration: BigInt(Math.floor(new Date(validated.data.expiration).getTime() / 1000)),
      user_id: user.id,
      affiliate_user_id: user.referred_by_user_id,
    })

    if (error) {
      console.error('Failed to create order.', error)
      return { error: DEFAULT_ERROR_MESSAGE }
    }
  }
  catch (error) {
    console.error('Failed to create order.', error)
    return { error: DEFAULT_ERROR_MESSAGE }
  }
}
