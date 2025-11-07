import type { QueryResult } from '@/types'
import { and, eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { cacheTags } from '@/lib/cache-tags'
import { bookmarks } from '@/lib/db/schema/bookmarks/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'

export const BookmarkRepository = {
  async toggleBookmark(user_id: string, event_id: string): Promise<QueryResult<null>> {
    return runQuery(async () => {
      try {
        const existing = await db
          .select({ eventId: bookmarks.event_id })
          .from(bookmarks)
          .where(
            and(
              eq(bookmarks.user_id, user_id),
              eq(bookmarks.event_id, event_id),
            ),
          )
          .limit(1)

        if (existing.length > 0) {
          await db
            .delete(bookmarks)
            .where(
              and(
                eq(bookmarks.user_id, user_id),
                eq(bookmarks.event_id, event_id),
              ),
            )
        }
        else {
          await db
            .insert(bookmarks)
            .values({ user_id, event_id })
        }

        revalidateTag(cacheTags.events(user_id), 'max')
        revalidateTag(cacheTags.event(`${event_id}:${user_id}`), 'max')

        return { data: null, error: null }
      }
      catch (error) {
        console.error('Bookmark operation failed:', error)
        return { data: null, error: 'Bookmark operation failed.' }
      }
    })
  },
}
