'use server'

import { CommentRepository } from '@/lib/db/comment'
import { UserRepository } from '@/lib/db/user'

export async function likeCommentAction(eventId: string, commentId: string) {
  try {
    const user = await UserRepository.getCurrentUser()
    if (!user) {
      return { data: null, error: 'Unauthenticated.' }
    }

    const { data, error } = await CommentRepository.toggleLike({ eventId, userId: user.id, commentId })

    if (error) {
      return { data: null, error: 'Failed to toggle like.' }
    }

    return { data, error: null }
  }
  catch {
    return { data: null, error: 'Internal server error.' }
  }
}
