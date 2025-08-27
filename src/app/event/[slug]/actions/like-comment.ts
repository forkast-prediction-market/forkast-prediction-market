'use server'

import { CommentModel } from '@/lib/db/comments'
import { getCurrentUser } from '@/lib/db/users'

export async function likeCommentAction(commentId: number) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { data: null, error: 'Unauthenticated.' }
    }

    const { data, error } = await CommentModel.toggleLike(user.id, commentId)
    if (error) {
      return { data: null, error: 'Failed to toggle like.' }
    }

    return { data, error: null }
  }
  catch {
    return { data: null, error: 'Internal server error.' }
  }
}
