'use server'

import { BookmarkModel } from '@/lib/db/bookmarks'
import { UserModel } from '@/lib/db/users'

export async function toggleBookmarkAction(eventId: string) {
  const user = await UserModel.getCurrentUser()
  if (!user) {
    return { data: null, error: 'Unauthenticated.' }
  }

  const userId = user.id
  return await BookmarkModel.toggleBookmark(userId, eventId)
}
