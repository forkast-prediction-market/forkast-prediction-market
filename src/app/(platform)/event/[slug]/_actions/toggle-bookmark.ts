'use server'

import { BookmarkRepository } from '@/lib/db/bookmark'
import { UserRepository } from '@/lib/db/user'

export async function toggleBookmarkAction(eventId: string) {
  const user = await UserRepository.getCurrentUser()
  if (!user) {
    return { data: null, error: 'Unauthenticated.' }
  }

  const userId = user.id
  return await BookmarkRepository.toggleBookmark(userId, eventId)
}
