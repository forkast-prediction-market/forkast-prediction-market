import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  try {
    const { commentId } = await params

    // Get current user session to check likes
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    const currentUserId = session?.user?.id ? Number.parseInt(session.user.id) : null

    // Fetch all replies for this comment
    const { data: replies, error } = await supabaseAdmin
      .from('comments')
      .select(`
        id,
        content,
        user_id,
        likes_count,
        replies_count,
        created_at,
        is_edited,
        users!inner(username, image, address)
      `)
      .eq('parent_comment_id', commentId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching replies:', error)
      return NextResponse.json(
        { error: 'Failed to fetch replies' },
        { status: 500 },
      )
    }

    // If user is logged in, check which replies they've liked
    let repliesWithLikeStatus: any[] = []
    if (currentUserId && replies?.length) {
      const replyIds = replies.map(reply => reply.id)

      const { data: userLikes } = await supabaseAdmin
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', currentUserId)
        .in('comment_id', replyIds)

      const likedIds = new Set(userLikes?.map(like => like.comment_id) || [])

      repliesWithLikeStatus = replies.map((reply: any) => ({
        ...reply,
        username: reply.users[0]?.username,
        user_avatar: reply.users[0]?.image,
        user_address: reply.users[0]?.address,
        user_has_liked: likedIds.has(reply.id),
      }))
    }
    else {
      repliesWithLikeStatus = replies?.map((reply: any) => ({
        ...reply,
        username: reply.users[0]?.username,
        user_avatar: reply.users[0]?.image,
        user_address: reply.users[0]?.address,
        user_has_liked: false,
      })) || []
    }

    return NextResponse.json(repliesWithLikeStatus)
  }
  catch (error) {
    console.error('Error in replies API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
