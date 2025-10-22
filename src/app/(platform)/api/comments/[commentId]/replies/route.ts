import { NextResponse } from 'next/server'
import { CommentRepository } from '@/lib/db/queries/comment'
import { UserRepository } from '@/lib/db/queries/user'
import { getSupabaseImageUrl } from '@/lib/supabase'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await params
    const user = await UserRepository.getCurrentUser()
    const currentUserId = user?.id

    const { data: replies, error: errorReplies } = await CommentRepository.getCommentReplies(commentId)
    if (errorReplies) {
      console.error('Failed to fetch comment replies', errorReplies)
      return NextResponse.json(
        { error: 'Failed to fetch replies.' },
        { status: 500 },
      )
    }

    let normalizedReplies = (replies ?? []).map((reply: any) => ({
      ...reply,
      recent_replies: Array.isArray(reply.recent_replies) ? reply.recent_replies : [],
      is_owner: currentUserId ? reply.user_id === currentUserId : false,
      user_has_liked: false,
    }))

    if (currentUserId && normalizedReplies.length) {
      const replyIds = normalizedReplies.map(reply => reply.id)
      const { data: userLikes, error: userLikesError } = await CommentRepository.getCommentsIdsLikedByUser(currentUserId, replyIds)
      if (userLikesError) {
        console.error('Failed to fetch replies like status', userLikesError)
        return NextResponse.json(
          { error: 'Failed to fetch replies.' },
          { status: 500 },
        )
      }

      const likedIds = new Set(((userLikes as unknown as any[]) ?? []).map((like: any) => like.comment_id))
      normalizedReplies = normalizedReplies.map(reply => ({
        ...reply,
        user_avatar: reply.user_avatar ? getSupabaseImageUrl(reply.user_avatar) : `https://avatar.vercel.sh/${user.user_avatar}.png`,
        user_has_liked: likedIds.has(reply.id),
      }))
    }

    const repliesWithoutExtraRelations = normalizedReplies.map(({ users, ...reply }) => reply)

    return NextResponse.json(repliesWithoutExtraRelations)
  }
  catch (error) {
    console.error('Unexpected error loading comment replies', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
