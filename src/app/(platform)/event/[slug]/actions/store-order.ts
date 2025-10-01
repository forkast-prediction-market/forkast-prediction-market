'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { AffiliateModel } from '@/lib/db/affiliates'
import { OrderModel } from '@/lib/db/orders'
import { SettingsModel } from '@/lib/db/settings'
import { UserModel } from '@/lib/db/users'

const StoreOrderSchema = z.object({
  condition_id: z.string(),
  outcome_index: z.coerce.number().int().min(0).max(1),
  side: z.enum(['buy', 'sell']),
  amount: z.coerce.number().positive(),
  price: z.coerce.number().positive().optional(),
  order_type: z.enum(['market', 'limit']).default('market'),
  slug: z.string(),
})

export async function storeOrderAction(formData: FormData) {
  const user = await UserModel.getCurrentUser()
  if (!user) {
    return { error: 'Unauthenticated.' }
  }

  const validated = StoreOrderSchema.safeParse({
    condition_id: formData.get('condition_id'),
    outcome_index: formData.get('outcome_index'),
    side: formData.get('side'),
    amount: formData.get('amount'),
    price: formData.get('price'),
    order_type: formData.get('order_type'),
    slug: formData.get('slug'),
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
      return { error: 'Failed to create order.' }
    }

    revalidatePath(`/event/${slug}`)
  }
  catch {
    return { error: 'An unknown error occurred.' }
  }
}
