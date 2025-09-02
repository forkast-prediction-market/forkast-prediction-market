'use server'

import { CommentModel } from '@/lib/db/comments'
import { UserModel } from '@/lib/db/users'

export async function likeCommentAction(commentId: string) {
  try {
    const user = await UserModel.getCurrentUser()
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
