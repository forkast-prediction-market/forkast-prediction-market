'use server'

import type { MarketOrderType } from '@/types'
import { revalidatePath } from 'next/cache'
import { CLOB_ORDER_TYPE } from '@/lib/constants'
import { UserRepository } from '@/lib/db/queries/user'

export async function updateTradingSettingsAction(formData: FormData) {
  try {
    const rawOrderType = (formData.get('market_order_type') || '').toString()
    const marketOrderType = Object.values(CLOB_ORDER_TYPE).includes(rawOrderType as any)
      ? rawOrderType
      : CLOB_ORDER_TYPE.FAK

    const user = await UserRepository.getCurrentUser({ disableCookieCache: true })
    if (!user) {
      return { error: 'Unauthenticated.' }
    }

    await UserRepository.updateUserTradingSettings(user, {
      market_order_type: marketOrderType as MarketOrderType,
    })

    revalidatePath('/settings')
  }
  catch {
    return { error: 'Failed to update trading settings' }
  }
}
