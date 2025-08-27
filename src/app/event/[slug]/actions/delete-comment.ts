'use server'

import { getCurrentUser } from '@/lib/db/users'
import { supabaseAdmin } from '@/lib/supabase'

export async function deleteCommentAction(commentId: number) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { error: 'Authentication required' }
    }

    const { data: comment, error: fetchError } = await supabaseAdmin
      .from('comments')
      .select('user_id, is_deleted')
      .eq('id', commentId)
      .single()

    if (fetchError || !comment) {
      return { error: 'Comment not found' }
    }

    if (comment.user_id !== Number.parseInt(user.id)) {
      return { error: 'You can only delete your own comments' }
    }

    if (comment.is_deleted) {
      return { error: 'Comment already deleted' }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('comments')
      .update({
        is_deleted: true,
        content: '[deleted]',
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)

    if (deleteError) {
      return { error: 'Failed to delete comment' }
    }

    return { success: true }
  }
  catch {
    return { error: 'Internal server error' }
  }
}
