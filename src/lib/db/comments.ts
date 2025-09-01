import { supabaseAdmin } from '@/lib/supabase'

export const CommentModel = {
  async getEventComments(eventId: string, limit: number = 20, offset: number = 0) {
    const { data, error } = await supabaseAdmin
      .from('v_comments_with_user')
      .select('*')
      .eq('event_id', eventId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    return { data, error }
  },

  async getCommentsIdsLikedByUser(userId: string, ids: string[]) {
    const { data, error } = await supabaseAdmin
      .from('comment_likes')
      .select('comment_id')
      .in('comment_id', ids)
      .eq('user_id', userId)

    return { data, error }
  },

  async getCommentReplies(commentId: string) {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .select(`
        id,
        content,
        user_id,
        likes_count,
        replies_count,
        created_at,
        users!inner(username, image, address)
      `)
      .eq('parent_comment_id', commentId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    return { data, error }
  },

  async store(userId: string, eventId: string, content: string, parentCommentId: string | null = null) {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert({
        event_id: eventId,
        user_id: userId,
        content: content.trim(),
        parent_comment_id: parentCommentId,
      })
      .select(`
        id,
        content,
        user_id,
        likes_count,
        replies_count,
        created_at
      `)
      .single()

    return { data, error }
  },

  async delete(userId: string, commentId: string) {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('user_id', userId)

    return { data, error }
  },

  async toggleLike(userId: string, commentId: string) {
    const { data: existingLike } = await supabaseAdmin
      .from('comment_likes')
      .select('comment_id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single()

    if (existingLike) {
      const { error: deleteError } = await supabaseAdmin
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId)

      if (deleteError) {
        return { error: deleteError }
      }

      const { data: comment, error: fetchError } = await supabaseAdmin
        .from('comments')
        .select('likes_count')
        .eq('id', commentId)
        .single()

      if (fetchError) {
        return { error: fetchError }
      }

      return {
        data: {
          likes_count: comment.likes_count,
          user_has_liked: false,
        },
        error: null,
      }
    }
    else {
      const { error: insertError } = await supabaseAdmin
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: userId,
        })

      if (insertError) {
        return { error: insertError }
      }

      const { data: comment, error: fetchError } = await supabaseAdmin
        .from('comments')
        .select('likes_count')
        .eq('id', commentId)
        .single()

      if (fetchError) {
        return { error: fetchError }
      }

      return {
        data: {
          likes_count: comment.likes_count,
          user_has_liked: true,
        },
        error: null,
      }
    }
  },
}
