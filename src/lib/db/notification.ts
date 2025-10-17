import type { Notification } from '@/types'
import { unstable_cacheTag as cacheTag, revalidateTag } from 'next/cache'
import { cacheTags } from '@/lib/cache-tags'
import { supabaseAdmin } from '@/lib/supabase'

export const NotificationRepository = {
  async getByUserId(userId: string) {
    'use cache'
    cacheTag(cacheTags.notifications(userId))

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

    revalidateTag(cacheTags.notifications(userId))

    return { data: null, error: null }
  },
}
