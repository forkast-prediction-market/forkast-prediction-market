'use server'

import { revalidatePath } from 'next/cache'
import { UserRepository } from '@/lib/db/queries/user'

const ALLOWED_ORDER_TYPES = new Set(['fak', 'fok'])

export async function updateTradingSettingsAction(formData: FormData) {
  try {
    const rawOrderType = (formData.get('market_order_type') || '').toString().toLowerCase()
    const marketOrderType = ALLOWED_ORDER_TYPES.has(rawOrderType)
      ? rawOrderType
      : 'fak'

    const user = await UserRepository.getCurrentUser()
    if (!user) {
      return { error: 'Unauthenticated.' }
    }

    await UserRepository.updateUserTradingSettingsById(user.id, {
      market_order_type: marketOrderType as 'fak' | 'fok',
    })

    revalidatePath('/settings')

    return { success: true }
  }
  catch {
    return { error: 'Failed to update trading settings' }
  }
}
