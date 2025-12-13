'use server'

import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { CommentRepository } from '@/lib/db/queries/comment'
import { UserRepository } from '@/lib/db/queries/user'

export async function deleteCommentAction(eventId: string, commentId: string) {
  try {
    const user = await UserRepository.getCurrentUser()
    if (!user) {
      return { error: 'Unauthenticated.' }
    }

    const { error: deleteError } = await CommentRepository.delete({ eventId, userId: user.id, commentId })
    if (deleteError) {
      return { error: 'Failed to delete comment' }
    }

    return { error: null }
  }
  catch {
    return { error: DEFAULT_ERROR_MESSAGE }
  }
}
