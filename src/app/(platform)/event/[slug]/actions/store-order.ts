'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { AffiliateModel } from '@/lib/db/affiliates'
import { OrderModel } from '@/lib/db/orders'
import { SettingsModel } from '@/lib/db/settings'
import { UserModel } from '@/lib/db/users'

const StoreOrderSchema = z.object({
  condition_id: z.string(),
  side: z.enum(['buy', 'sell']),
  amount: z.coerce.number().positive(),
  price: z.coerce.number().positive().optional(),
  type: z.enum(['market', 'limit']).default('market'),
  slug: z.string(),
  token_id: z.string(),
})

const DEFAULT_ERROR_MESSAGE = 'Something went wrong while processing your order. Please try again.'

export async function storeOrderAction(payload: FormData) {
  const user = await UserModel.getCurrentUser()
  if (!user) {
    return { error: 'Unauthenticated.' }
  }

  const validated = StoreOrderSchema.safeParse({
    condition_id: payload.get('condition_id'),
    token_id: payload.get('token_id'),
    side: payload.get('side'),
    amount: payload.get('amount'),
    price: payload.get('price'),
    type: payload.get('type'),
    slug: payload.get('slug'),
  })

  if (!validated.success) {
    return {
      error: validated.error.issues[0].message,
    }
  }

  const { slug, ...orderPayload } = validated.data

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
      },
      body: JSON.stringify({
        trader: user.address,
        token_id: validated.data.token_id,
        amount: validated.data.amount,
        side: validated.data.side,
        type: validated.data.type,
        referrer: process.env.FEE_RECIPIENT_WALLET,
        affiliate: undefined,
        fee_rate_bps: tradeFeeBps,
        affiliate_percentage: affiliateShareBps,
      }),
    })

    if (!clobResponse.ok) {
      return { error: DEFAULT_ERROR_MESSAGE }
    }

    const affiliateUserId = user.referred_by_user_id
      || referral?.affiliate_user_id
      || null

    const tradeFeeDecimal = tradeFeeBps / 10000
    const totalFeeAmount = Number((orderPayload.amount * tradeFeeDecimal).toFixed(6))
    const affiliateShareDecimal = affiliateUserId ? (affiliateShareBps / 10000) : 0
    const affiliateFeeAmount = affiliateUserId
      ? Number((totalFeeAmount * affiliateShareDecimal).toFixed(6))
      : 0
    const forkFeeAmount = Math.max(0, Number((totalFeeAmount - affiliateFeeAmount).toFixed(6)))

    const { error } = await OrderModel.createOrder({
      ...orderPayload,
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

    revalidatePath(`/event/${slug}`)
  }
  catch (error) {
    console.error('Failed to create order.', error)
    return { error: DEFAULT_ERROR_MESSAGE }
  }
}
