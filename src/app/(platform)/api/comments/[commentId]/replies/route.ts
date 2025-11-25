import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
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
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    let normalizedReplies = (replies ?? []).map((reply: any) => ({
      ...reply,
      recent_replies: Array.isArray(reply.recent_replies) ? reply.recent_replies : [],
      is_owner: currentUserId ? reply.user_id === currentUserId : false,
      user_has_liked: false,
    }))

    if (normalizedReplies.length) {
      const replyUserIds = Array.from(new Set(normalizedReplies.map(reply => String(reply.user_id))))
      if (replyUserIds.length) {
        const { data: replyUsers } = await UserRepository.getUsersByIds(replyUserIds)
        const proxyLookup = new Map<string, string | null>(
          (replyUsers ?? []).map(profile => [profile.id, profile.proxy_wallet_address ?? null]),
        )
        normalizedReplies = normalizedReplies.map(reply => ({
          ...reply,
          user_proxy_wallet_address: proxyLookup.get(String(reply.user_id)) ?? null,
        }))
      }
    }

    if (currentUserId && normalizedReplies.length) {
      const replyIds = normalizedReplies.map(reply => reply.id)
      const { data: userLikes, error: userLikesError } = await CommentRepository.getCommentsIdsLikedByUser(currentUserId, replyIds)
      if (userLikesError) {
        return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
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
    console.error('API Error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
