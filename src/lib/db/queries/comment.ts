import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { cacheTag, updateTag } from 'next/cache'
import { cacheTags } from '@/lib/cache-tags'
import { comment_likes, comments, v_comments_with_user } from '@/lib/db/schema/comments/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'

export const CommentRepository = {
  async getEventComments(eventId: string, limit: number = 20, offset: number = 0) {
    'use cache'
    cacheTag(cacheTags.eventComments(eventId))

    return await runQuery(async () => {
      const result = await db
        .select()
        .from(v_comments_with_user)
        .where(and(
          eq(v_comments_with_user.event_id, eventId),
          isNull(v_comments_with_user.parent_comment_id),
        ))
        .orderBy(desc(v_comments_with_user.created_at))
        .limit(limit)
        .offset(offset)

      return { data: result, error: null }
    })
  },

  async getCommentsIdsLikedByUser(userId: string, ids: string[]) {
    'use cache'
    cacheTag(cacheTags.commentLikes(userId))

    return await runQuery(async () => {
      const result = await db
        .select({ comment_id: comment_likes.comment_id })
        .from(comment_likes)
        .where(and(
          eq(comment_likes.user_id, userId),
          inArray(comment_likes.comment_id, ids),
        ))

      return { data: result, error: null }
    })
  },

  async getCommentReplies(commentId: string) {
    'use cache'

    return await runQuery(async () => {
      const result = await db
        .select()
        .from(v_comments_with_user)
        .where(eq(v_comments_with_user.parent_comment_id, commentId))
        .orderBy(asc(v_comments_with_user.created_at))

      if (result && result.length > 0 && result[0].event_id) {
        cacheTag(cacheTags.eventComments(result[0].event_id))
      }

      return { data: result, error: null }
    })
  },

  async store(userId: string, eventId: string, content: string, parentCommentId: string | null = null) {
    return await runQuery(async () => {
      const result = await db
        .insert(comments)
        .values({
          event_id: eventId,
          user_id: userId,
          content: content.trim(),
          parent_comment_id: parentCommentId,
        })
        .returning({
          id: comments.id,
          content: comments.content,
          user_id: comments.user_id,
          likes_count: comments.likes_count,
          replies_count: comments.replies_count,
          created_at: comments.created_at,
        })

      updateTag(cacheTags.eventComments(eventId))
      updateTag(cacheTags.event(`${eventId}:${userId}`))
      updateTag(cacheTags.event(`${eventId}:`))

      return { data: result[0], error: null }
    })
  },

  async delete(args: { eventId: string, userId: string, commentId: string }) {
    return await runQuery(async () => {
      const result = await db
        .update(comments)
        .set({
          is_deleted: true,
          updated_at: new Date(),
        })
        .where(and(
          eq(comments.id, args.commentId),
          eq(comments.user_id, args.userId),
        ))

      updateTag(cacheTags.eventComments(args.eventId))
      updateTag(cacheTags.event(`${args.eventId}:${args.userId}`))
      updateTag(cacheTags.event(`${args.eventId}:`))

      return { data: result, error: null }
    })
  },

  async toggleLike(args: { eventId: string, userId: string, commentId: string }) {
    return await runQuery(async () => {
      const existingLike = await db
        .select()
        .from(comment_likes)
        .where(and(
          eq(comment_likes.comment_id, args.commentId),
          eq(comment_likes.user_id, args.userId),
        ))

      if (existingLike.length > 0) {
        await db
          .delete(comment_likes)
          .where(and(
            eq(comment_likes.comment_id, args.commentId),
            eq(comment_likes.user_id, args.userId),
          ))

        const comment = await db
          .select({ likes_count: comments.likes_count })
          .from(comments)
          .where(eq(comments.id, args.commentId))

        updateTag(cacheTags.eventComments(args.eventId))
        updateTag(cacheTags.commentLikes(args.userId))

        return {
          data: {
            likes_count: comment[0].likes_count,
            user_has_liked: false,
          },
          error: null,
        }
      }
      else {
        await db
          .insert(comment_likes)
          .values({
            comment_id: args.commentId,
            user_id: args.userId,
          })

        const comment = await db
          .select({ likes_count: comments.likes_count })
          .from(comments)
          .where(eq(comments.id, args.commentId))

        updateTag(cacheTags.eventComments(args.eventId))
        updateTag(cacheTags.commentLikes(args.userId))

        return {
          data: {
            likes_count: comment[0].likes_count,
            user_has_liked: true,
          },
          error: null,
        }
      }
    })
  },
}
