import { NextResponse } from 'next/server'
import { CommentModel } from '@/lib/db/comments'
import { EventModel } from '@/lib/db/events'
import { getCurrentUser } from '@/lib/db/users'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get('limit') || '20')
    const offset = Number.parseInt(searchParams.get('offset') || '0')

    const { data: event, error: eventError } = await EventModel.getIdBySlug(slug)
    if (!event || eventError) {
      return NextResponse.json(
        { error: 'Event not found.' },
        { status: 404 },
      )
    }

    const user = await getCurrentUser()
    const currentUserId = user?.id

    const { data: comments, error: rootCommentsError } = await CommentModel.getEventComments(event.id, limit, offset)
    if (rootCommentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch comments.' },
        { status: 500 },
      )
    }

    let commentsWithLikeStatus = comments || []
    if (currentUserId && comments?.length) {
      const commentIds = comments.map(c => c.id)
      const replyIds = comments.flatMap(c => c.recent_replies?.map((r: any) => r.id) || [])
      const allIds = [...commentIds, ...replyIds]

      if (allIds.length > 0) {
        const { data: userLikes, error: userLikesError } = await CommentModel.getCommentsIdsLikedByUser(currentUserId, allIds)
        if (userLikesError) {
          return NextResponse.json(
            { error: 'Failed to fetch comments.' },
            { status: 500 },
          )
        }

        const likedIds = new Set(userLikes?.map(like => like.comment_id) || [])

        commentsWithLikeStatus = comments.map(comment => ({
          ...comment,
          is_owner: currentUserId === comment.user_id,
          user_has_liked: likedIds.has(comment.id),
          recent_replies: comment.recent_replies?.map((reply: any) => ({
            ...reply,
            is_owner: currentUserId === reply.user_id,
            user_has_liked: likedIds.has(reply.id),
          })) || [],
        }))
      }
    }

    return NextResponse.json(commentsWithLikeStatus)
  }
  catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
