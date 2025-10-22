'use server'

import { CommentRepository } from '@/lib/db/queries/comment'
import { UserRepository } from '@/lib/db/queries/user'

export async function deleteCommentAction(eventId: string, commentId: string) {
  try {
    const user = await UserRepository.getCurrentUser()
    if (!user) {
      return { error: 'Authentication required' }
    }

    const { error: deleteError } = await CommentRepository.delete({ eventId, userId: user.id, commentId })
    if (deleteError) {
      return { error: 'Failed to delete comment' }
    }

    return { error: false }
  }
  catch {
    return { error: 'Internal server error' }
  }
}
