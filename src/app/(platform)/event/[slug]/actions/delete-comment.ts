'use server'

import { CommentModel } from '@/lib/db/comments'
import { UserModel } from '@/lib/db/users'

export async function deleteCommentAction(eventId: string, commentId: string) {
  try {
    const user = await UserModel.getCurrentUser()
    if (!user) {
      return { error: 'Authentication required' }
    }

    const { error: deleteError } = await CommentModel.delete({ eventId, userId: user.id, commentId })
    if (deleteError) {
      return { error: 'Failed to delete comment' }
    }

    return { error: false }
  }
  catch {
    return { error: 'Internal server error' }
  }
}
