'use server'

import { CommentModel } from '@/lib/db/comments'
import { getCurrentUser } from '@/lib/db/users'

export async function submitCommentAction(eventId: number, formData: FormData) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: 'Unauthenticated.' }
    }

    const content = formData.get('content') as string
    const parent_comment_id = formData.get('parent_comment_id') as unknown as number

    if (!content || content.trim().length === 0) {
      return { error: 'Comment content is required' }
    }

    if (content.length > 2000) {
      return { error: 'Comment is too long (max 2000 characters).' }
    }

    const { data: newComment, error: errorInsert } = await CommentModel.store(user.id, eventId, content, parent_comment_id)
    if (!newComment || errorInsert) {
      return { error: 'Failed to create comment.' }
    }

    return {
      comment: {
        id: newComment.id,
        content: newComment.content,
        user_id: newComment.user_id,
        likes_count: newComment.likes_count,
        replies_count: newComment.replies_count,
        created_at: newComment.created_at,
        is_owner: true,
        user_has_liked: false,
        recent_replies: [],
      },
    }
  }
  catch {
    return { error: 'Internal server error' }
  }
}
