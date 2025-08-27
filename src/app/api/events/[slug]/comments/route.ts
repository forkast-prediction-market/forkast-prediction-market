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
    const currentUserId = user?.id ? Number.parseInt(user.id) : null

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
          user_has_liked: likedIds.has(comment.id),
          recent_replies: comment.recent_replies?.map((reply: any) => ({
            ...reply,
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthenticated.' },
        { status: 401 },
      )
    }

    const { slug } = await params
    const { content, parent_comment_id } = await request.json()
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 },
      )
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Comment is too long (max 2000 characters).' },
        { status: 400 },
      )
    }

    const { data: event, error: eventError } = await EventModel.getIdBySlug(slug)
    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found.' },
        { status: 404 },
      )
    }

    // Insert new comment
    const { data: newComment, error: errorInsert } = await CommentModel.store(user.id, event.id, content, parent_comment_id)
    if (!newComment || errorInsert) {
      return NextResponse.json(
        { error: 'Failed to create comment.' },
        { status: 500 },
      )
    }

    const formattedComment = {
      id: newComment.id,
      content: newComment.content,
      user_id: newComment.user_id,
      username: newComment.users[0]?.username,
      user_avatar: newComment.users[0]?.image,
      user_address: newComment.users[0]?.address,
      likes_count: newComment.likes_count,
      replies_count: newComment.replies_count,
      created_at: newComment.created_at,
      user_has_liked: false,
      recent_replies: [],
    }

    return NextResponse.json(formattedComment)
  }
  catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
