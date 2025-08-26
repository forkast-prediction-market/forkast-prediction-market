'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser, updateCurrentUserNotificationPreferences } from '@/lib/db/users'

export async function updateNotificationsSettingsAction(formData: FormData) {
  try {
    const preferences = {
      email_resolutions: formData.get('email_resolutions') === 'on',
      inapp_order_fills: formData.get('inapp_order_fills') === 'on',
      inapp_hide_small_fills: formData.get('inapp_hide_small_fills') === 'on',
      inapp_resolutions: formData.get('inapp_resolutions') === 'on',
    }

    const user = await getCurrentUser()
    if (!user) {
      return
    }

    await updateCurrentUserNotificationPreferences(user.id, preferences)

    revalidatePath('/settings')
  }
  catch {
    return { error: 'Failed to update notification settings' }
  }
}
