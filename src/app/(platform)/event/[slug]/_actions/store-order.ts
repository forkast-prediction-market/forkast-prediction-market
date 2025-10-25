'use server'

import { z } from 'zod'
import { AffiliateRepository } from '@/lib/db/queries/affiliate'
import { OrderRepository } from '@/lib/db/queries/order'
import { SettingsRepository } from '@/lib/db/queries/settings'
import { UserRepository } from '@/lib/db/queries/user'

const StoreOrderSchema = z.object({
  condition_id: z.string(),
  token_id: z.string(),
  side: z.union([z.literal(0), z.literal(1)]),
  type: z.union([z.literal(0), z.literal(1)]),
  maker_amount: z.string().optional(),
  price: z.string().optional(),
  shares: z.string().optional(),
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
    return {
      error: validated.error.issues[0].message,
    }
  }

  try {
    const [{ data: allSettings }, { data: referral }] = await Promise.all([
      SettingsRepository.getSettings(),
      AffiliateRepository.getReferral(user.id),
    ])

    const affiliateSettings = allSettings?.affiliate
    const tradeFeeBps = Number.parseInt(affiliateSettings?.trade_fee_bps?.value || '0', 10)
    const affiliateShareBps = Number.parseInt(affiliateSettings?.affiliate_share_bps?.value || '0', 10)

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
        fee_rate_bps: tradeFeeBps, // ok
        taker_address: user.address, // ok
        maker_address: user.address, // ok
        token_id: validated.data.token_id, // ok
        condition_id: validated.data.condition_id, // ok
        salt: 987654321, // ok
        condition_expires_at: '2025-12-31T23:59:59Z', // ok
        side: validated.data.side, // ok
        type: validated.data.type === 0 ? 'MARKET' : 'LIMIT', // ok
        maker_amount: validated.data.maker_amount ? Number.parseInt(validated.data.maker_amount) : undefined,
        price: validated.data.price && validated.data.type === 1 ? Number.parseInt(validated.data.price) : undefined,
        shares: validated.data.shares && validated.data.type === 1 ? Number.parseInt(validated.data.shares) : undefined,
        referrer: process.env.FEE_RECIPIENT_WALLET,
        affiliate: referral?.affiliate_user?.address,
        affiliate_percentage: affiliateShareBps,
      }),
    })

    if (!clobResponse.ok) {
      const json = await clobResponse.json()
      console.error('Failed to send order to CLOB.', json)
      return json
    }

    const affiliateUserId = user.referred_by_user_id
      || referral?.affiliate_user_id
      || null

    const tradeFeeDecimal = tradeFeeBps / 10000
    const totalFeeAmount = Number((2 * tradeFeeDecimal).toFixed(6))
    const affiliateShareDecimal = affiliateUserId ? (affiliateShareBps / 10000) : 0
    const affiliateFeeAmount = affiliateUserId
      ? Number((totalFeeAmount * affiliateShareDecimal).toFixed(6))
      : 0
    const forkFeeAmount = Math.max(0, Number((totalFeeAmount - affiliateFeeAmount).toFixed(6)))

    const { error } = await OrderRepository.createOrder({
      side: validated.data.side,
      type: validated.data.type,
      condition_id: validated.data.condition_id,
      maker_address: user.address,
      maker_amount: validated.data.maker_amount,
      price: validated.data.price,
      shares: validated.data.shares,
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
  }
  catch (error) {
    console.error('Failed to create order.', error)
    return { error: DEFAULT_ERROR_MESSAGE }
  }
}
