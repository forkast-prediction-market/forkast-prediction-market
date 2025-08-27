import { supabaseAdmin } from '@/lib/supabase'

export const CommentModel = {
  async getEventComments(eventId: number, limit: number = 20, offset: number = 0) {
    const { data, error } = await supabaseAdmin
      .from('v_comments_with_user')
      .select('*')
      .eq('event_id', eventId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    return { data, error }
  },

  async getCommentsIdsLikedByUser(userId: string, allIds: number[]) {
    const { data, error } = await supabaseAdmin
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', userId)
      .in('comment_id', allIds)

    return { data, error }
  },

  async store(userId: string, eventId: number, content: string, parentCommentId: number | null = null) {
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

  async delete(userId: string, commentId: number) {
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
}
