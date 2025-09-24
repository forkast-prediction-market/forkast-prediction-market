'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { AffiliateModel } from '@/lib/db/affiliates'
import { UserModel } from '@/lib/db/users'

export interface ForkSettingsActionState {
  error?: string
  success?: string
}

const UpdateForkSettingsSchema = z.object({
  trade_fee_percent: z.coerce.number().min(0).max(9),
  affiliate_share_percent: z.coerce.number().min(0).max(100),
})

export async function updateForkSettingsAction(
  _prevState: ForkSettingsActionState,
  formData: FormData,
): Promise<ForkSettingsActionState> {
  const user = await UserModel.getCurrentUser()
  if (!user || !user.isAdmin) {
    return { error: 'Not authorized.' }
  }

  const parsed = UpdateForkSettingsSchema.safeParse({
    trade_fee_percent: formData.get('trade_fee_percent'),
    affiliate_share_percent: formData.get('affiliate_share_percent'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const tradeFeeBps = Math.round(parsed.data.trade_fee_percent * 100)
  const affiliateShareBps = Math.round(parsed.data.affiliate_share_percent * 100)

  const { error } = await AffiliateModel.updateForkSettings({
    trade_fee_bps: tradeFeeBps,
    affiliate_share_bps: affiliateShareBps,
  })

  if (error) {
    console.error('Failed to update fork settings', error)
    return { error: 'Failed to update settings.' }
  }

  revalidatePath('/admin')
  return { success: 'Settings updated successfully.' }
}
