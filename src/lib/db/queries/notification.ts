import { and, desc, eq } from 'drizzle-orm'
import { cacheTag, revalidateTag } from 'next/cache'
import { cacheTags } from '@/lib/cache-tags'
import { notifications } from '@/lib/db/schema/notifications/tables'
import { db } from '@/lib/drizzle'

export const NotificationRepository = {
  async getByUserId(user_id: string) {
    'use cache'
    cacheTag(cacheTags.notifications(user_id))

    try {
      const data = await db
        .select()
        .from(notifications)
        .where(eq(notifications.user_id, user_id))
        .orderBy(desc(notifications.created_at))

      return { data, error: null }
    }
    catch (error) {
      console.error('Failed to fetch notifications:', error)
      return { data: null, error }
    }
  },

  async deleteById(notificationId: string, user_id: string) {
    try {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.user_id, user_id),
          ),
        )

      revalidateTag(cacheTags.notifications(user_id), 'max')

      return { data: null, error: null }
    }
    catch (error) {
      console.error('Failed to delete notification:', error)
      return { data: null, error }
    }
  },
}
