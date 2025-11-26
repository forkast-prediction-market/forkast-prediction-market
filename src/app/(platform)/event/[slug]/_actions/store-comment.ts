'use server'

import { CommentRepository } from '@/lib/db/queries/comment'
import { UserRepository } from '@/lib/db/queries/user'

export async function storeCommentAction(eventId: string, formData: FormData) {
  const user = await UserRepository.getCurrentUser()
  if (!user) {
    return { error: 'Unauthenticated.' }
  }

  const content = formData.get('content') as string
  const parent_comment_id = formData.get('parent_comment_id') as string | null

  if (!content || content.trim().length === 0) {
    return { error: 'Comment content is required' }
  }

  if (content.length > 2000) {
    return { error: 'Comment is too long (max 2000 characters).' }
  }

  const { data: newComment, error: errorInsert } = await CommentRepository.store(user.id, eventId, content, parent_comment_id)
  if (!newComment || errorInsert) {
    return { error: 'Failed to create comment.' }
  }

  return {
    comment: {
      id: newComment.id,
      content: newComment.content,
      user_id: newComment.user_id,
      username: user.username,
      user_avatar: user.image,
      user_address: user.address,
      user_proxy_wallet_address: user.proxy_wallet_address ?? null,
      likes_count: newComment.likes_count,
      replies_count: newComment.replies_count,
      created_at: newComment.created_at,
      is_owner: true,
      user_has_liked: false,
      recent_replies: [],
    },
  }
}
