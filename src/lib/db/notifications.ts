import type { Notification } from '@/types'
import { supabaseAdmin } from '@/lib/supabase'

export const NotificationModel = {
  async getByUserId(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error }
    }

    return { data: data as Notification[], error: null }
  },

  async deleteById(notificationId: string, userId: string) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) {
      return { data: null, error }
    }

    return { data: null, error: null }
  },
}
