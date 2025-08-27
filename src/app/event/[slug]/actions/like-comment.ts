'use server'

import { CommentModel } from '@/lib/db/comments'
import { getCurrentUser } from '@/lib/db/users'

export async function likeCommentAction(commentId: number) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: 'Unauthenticated.' }
    }

    const { data: result, error } = await CommentModel.toggleLike(user.id, commentId)
    if (error) {
      return { error: 'Failed to toggle like' }
    }

    return {
      success: true,
      action: result.action,
      likes_count: result.likes_count,
      user_has_liked: result.user_has_liked,
    }
  }
  catch {
    return { error: 'Internal server error' }
  }
}
