import { NextResponse } from 'next/server'
import { CommentModel } from '@/lib/db/comments'
import { UserModel } from '@/lib/db/users'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await params
    const user = await UserModel.getCurrentUser()
    const currentUserId = user?.id

    const { data: replies, error: errorReplies } = await CommentModel.getCommentReplies(commentId)
    if (errorReplies) {
      return NextResponse.json(
        { error: 'Failed to fetch replies.' },
        { status: 500 },
      )
    }

    let likedIds: Set<string> = new Set<string>([])
    if (currentUserId && replies?.length) {
      const replyIds = replies.map(reply => reply.id)
      const { data: userLikes } = await CommentModel.getCommentsIdsLikedByUser(currentUserId, replyIds)
      if (userLikes) {
        likedIds = new Set(userLikes?.map(like => like.comment_id) || [])
      }
    }

    const repliesWithLikeStatus = replies?.map((reply: any) => ({
      ...reply,
      username: reply.users?.username,
      user_avatar: reply.users?.image,
      user_address: reply.users?.address,
      user_has_liked: likedIds.has(reply.id),
    })) || []

    return NextResponse.json(repliesWithLikeStatus)
  }
  catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
