import type { Notification } from '@/types'
import { supabaseAdmin } from '@/lib/supabase'

export const NotificationModel = {
  async getByUserId(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching notifications:', error)
        return { data: null, error: 'Failed to fetch notifications' }
      }

      return { data: data as Notification[], error: null }
    }
    catch (err) {
      console.error('Unexpected error fetching notifications:', err)
      return { data: null, error: 'Failed to fetch notifications' }
    }
  },

  async deleteById(notificationId: string, userId: string) {
    try {
      const { data: notification, error: fetchError } = await supabaseAdmin
        .from('notifications')
        .select('id, user_id')
        .eq('id', notificationId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return { data: null, error: 'Notification not found' }
        }
        console.error('Error fetching notification for deletion:', fetchError)
        return { data: null, error: 'Failed to verify notification' }
      }

      if (notification.user_id !== userId) {
        return { data: null, error: 'Unauthorized to delete this notification' }
      }

      const { error: deleteError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId)

      if (deleteError) {
        console.error('Error deleting notification:', deleteError)
        return { data: null, error: 'Failed to delete notification' }
      }

      return { data: { success: true }, error: null }
    }
    catch (err) {
      console.error('Unexpected error deleting notification:', err)
      return { data: null, error: 'Failed to delete notification' }
    }
  },
}
