import { NextResponse } from 'next/server'
import { CommentModel } from '@/lib/db/comments'
import { getCurrentUser } from '@/lib/db/users'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await params
    const user = await getCurrentUser()
    const currentUserId = user?.id

    const { data: replies, error: errorReplies } = await CommentModel.getCommentReplies(commentId)
    if (errorReplies) {
      return NextResponse.json(
        { error: 'Failed to fetch replies.' },
        { status: 500 },
      )
    }

    let repliesWithLikeStatus: any[] = []
    if (currentUserId && replies?.length) {
      const replyIds = replies.map(reply => reply.id)
      const { data: userLikes } = await CommentModel.getCommentsIdsLikedByUser(currentUserId, replyIds)
      const likedIds = new Set(userLikes?.map(like => like.comment_id) || [])

      repliesWithLikeStatus = replies.map((reply: any) => ({
        ...reply,
        username: reply.users?.username,
        user_avatar: reply.users?.image,
        user_address: reply.users?.address,
        user_has_liked: likedIds.has(reply.id),
      }))
    }
    else {
      repliesWithLikeStatus = replies?.map((reply: any) => ({
        ...reply,
        username: reply.users?.username,
        user_avatar: reply.users?.image,
        user_address: reply.users?.address,
        user_has_liked: false,
      })) || []
    }

    return NextResponse.json(repliesWithLikeStatus)
  }
  catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
