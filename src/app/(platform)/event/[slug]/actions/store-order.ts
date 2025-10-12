'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { AffiliateModel } from '@/lib/db/affiliates'
import { OrderModel } from '@/lib/db/orders'
import { SettingsModel } from '@/lib/db/settings'
import { UserModel } from '@/lib/db/users'

const StoreOrderSchema = z.object({
  condition_id: z.string(),
  token_id: z.string(),
  side: z.enum(['buy', 'sell']),
  amount: z.number().positive(),
  price: z.number().positive().optional(),
  type: z.enum(['market', 'limit']).default('market'),
  slug: z.string(),
})

type StoreOrderInput = z.infer<typeof StoreOrderSchema>

const DEFAULT_ERROR_MESSAGE = 'Something went wrong while processing your order. Please try again.'

export async function storeOrderAction(payload: StoreOrderInput) {
  const user = await UserModel.getCurrentUser()
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
    const [{ data: allSettings }, { data: referral }] = await Promise.all([
      SettingsModel.getSettings(),
      AffiliateModel.getReferral(user.id),
    ])

    const affiliateSettings = allSettings?.affiliate
    const tradeFeeBps = Number.parseInt(affiliateSettings?.trade_fee_bps?.value || '0', 10)
    const affiliateShareBps = Number.parseInt(affiliateSettings?.affiliate_share_bps?.value || '0', 10)

    const clobUrl = `${process.env.CLOB_URL}/api/v1/orders`
    const clobResponse = await fetch(clobUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': process.env.CLOB_API_KEY!,
      },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        taker_address: user.address,
        maker_address: user.address,
        nonce: Math.floor(Math.random() * 1000),
        expiration: Math.floor(Math.random() * 1000),
        token_id: validated.data.token_id,
        amount: validated.data.amount,
        side: validated.data.side.toUpperCase(),
        order_type: validated.data.type.toUpperCase(),
        order_struct_metadata: { taker_address: user.address },
        referrer: process.env.FEE_RECIPIENT_WALLET,
        affiliate: referral?.affiliate_user[0]?.address,
        fee_rate_bps: tradeFeeBps,
        affiliate_percentage: affiliateShareBps,
      }),
    })

    if (!clobResponse.ok) {
      const text = await clobResponse.text()
      console.error('Failed to send order to CLOB.', text)
      return { error: DEFAULT_ERROR_MESSAGE }
    }

    const affiliateUserId = user.referred_by_user_id
      || referral?.affiliate_user_id
      || null

    const tradeFeeDecimal = tradeFeeBps / 10000
    const totalFeeAmount = Number((validated.data.amount * tradeFeeDecimal).toFixed(6))
    const affiliateShareDecimal = affiliateUserId ? (affiliateShareBps / 10000) : 0
    const affiliateFeeAmount = affiliateUserId
      ? Number((totalFeeAmount * affiliateShareDecimal).toFixed(6))
      : 0
    const forkFeeAmount = Math.max(0, Number((totalFeeAmount - affiliateFeeAmount).toFixed(6)))

    const { error } = await OrderModel.createOrder({
      side: validated.data.side,
      condition_id: validated.data.condition_id,
      amount: validated.data.amount,
      price: validated.data.price,
      type: validated.data.type,
      token_id: validated.data.token_id,
      user_id: user.id,
      affiliate_user_id: affiliateUserId,
      trade_fee_bps: tradeFeeBps,
      affiliate_share_bps: affiliateUserId ? affiliateShareBps : 0,
      fork_fee_amount: forkFeeAmount,
      affiliate_fee_amount: affiliateFeeAmount,
    })

    if (error) {
      console.error('Failed to create order.', error)
      return { error: DEFAULT_ERROR_MESSAGE }
    }

    revalidatePath(`/event/${validated.data.slug}`)
  }
  catch (error) {
    console.error('Failed to create order.', error)
    return { error: DEFAULT_ERROR_MESSAGE }
  }
}
