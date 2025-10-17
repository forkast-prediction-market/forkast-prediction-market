import { NextResponse } from 'next/server'
import { CommentRepository } from '@/lib/db/comment'
import { EventRepository } from '@/lib/db/event'
import { UserRepository } from '@/lib/db/user'
import { getSupabaseImageUrl } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get('limit') || '20')
    const offset = Number.parseInt(searchParams.get('offset') || '0')

    const { data: event, error: eventError } = await EventRepository.getIdBySlug(slug)
    if (!event || eventError) {
      return NextResponse.json(
        { error: 'Event not found.' },
        { status: 404 },
      )
    }

    const user = await UserRepository.getCurrentUser()
    const currentUserId = user?.id

    const { data: comments, error: rootCommentsError } = await CommentRepository.getEventComments(event.id, limit, offset)
    if (rootCommentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch comments.' },
        { status: 500 },
      )
    }

    const normalizedComments = (comments ?? []).map((comment: any) => ({
      ...comment,
      user_avatar: comment.user_avatar ? getSupabaseImageUrl(comment.user_avatar) : `https://avatar.vercel.sh/${comment.user_address}.png`,
      recent_replies: Array.isArray(comment.recent_replies) ? comment.recent_replies : [],
    }))

    if (!currentUserId || normalizedComments.length === 0) {
      const commentsWithoutLikes = normalizedComments.map((comment: any) => ({
        ...comment,
        is_owner: false,
        user_has_liked: false,
        recent_replies: (comment.recent_replies || [])
          .slice(0, comment.replies_count > 3 ? 3 : comment.replies_count)
          .map((reply: any) => ({
            ...reply,
            user_avatar: reply.user_avatar ? getSupabaseImageUrl(reply.user_avatar) : `https://avatar.vercel.sh/${reply.user_address}.png`,
            is_owner: false,
            user_has_liked: false,
          })),
      }))

      return NextResponse.json(commentsWithoutLikes)
    }

    const commentIds = normalizedComments.map(comment => comment.id)
    const replyIds = normalizedComments.flatMap(comment => comment.recent_replies.map((reply: any) => reply.id))
    const allIds = [...commentIds, ...replyIds]

    if (allIds.length === 0) {
      const commentsWithoutLikes = normalizedComments.map((comment: any) => ({
        ...comment,
        is_owner: currentUserId === comment.user_id,
        user_has_liked: false,
        recent_replies: (comment.recent_replies || [])
          .slice(0, comment.replies_count > 3 ? 3 : comment.replies_count)
          .map((reply: any) => ({
            ...reply,
            user_avatar: reply.user_avatar ? getSupabaseImageUrl(reply.user_avatar) : `https://avatar.vercel.sh/${user.user_avatar}.png`,
            is_owner: currentUserId === reply.user_id,
            user_has_liked: false,
          })),
      }))

      return NextResponse.json(commentsWithoutLikes)
    }

    const { data: userLikes, error: userLikesError } = await CommentRepository.getCommentsIdsLikedByUser(currentUserId, allIds)
    if (userLikesError) {
      return NextResponse.json(
        { error: 'Failed to fetch comments.' },
        { status: 500 },
      )
    }

    const likedIds = new Set(userLikes?.map(like => like.comment_id) || [])

    const commentsWithLikeStatus = normalizedComments.map((comment: any) => {
      const baseReplies = comment.recent_replies || []
      const limitedReplies = comment.replies_count > 3
        ? baseReplies.slice(0, 3)
        : baseReplies

      return {
        ...comment,
        is_owner: currentUserId === comment.user_id,
        user_has_liked: likedIds.has(comment.id),
        recent_replies: limitedReplies.map((reply: any) => ({
          ...reply,
          user_avatar: reply.user_avatar ? getSupabaseImageUrl(reply.user_avatar) : `https://avatar.vercel.sh/${user.user_avatar}.png`,
          is_owner: currentUserId === reply.user_id,
          user_has_liked: likedIds.has(reply.id),
        })),
      }
    })

    return NextResponse.json(commentsWithLikeStatus)
  }
  catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
