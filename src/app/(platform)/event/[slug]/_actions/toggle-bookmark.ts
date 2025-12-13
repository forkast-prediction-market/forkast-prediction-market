'use server'

import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { BookmarkRepository } from '@/lib/db/queries/bookmark'
import { UserRepository } from '@/lib/db/queries/user'

export async function toggleBookmarkAction(eventId: string) {
  try {
    const user = await UserRepository.getCurrentUser()
    if (!user) {
      return { data: null, error: 'Unauthenticated.' }
    }

    const userId = user.id
    return await BookmarkRepository.toggleBookmark(userId, eventId)
  }
  catch {
    return { data: null, error: DEFAULT_ERROR_MESSAGE }
  }
}
