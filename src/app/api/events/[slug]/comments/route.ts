import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getEventIdBySlug } from '@/lib/db/events'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get('limit') || '20')
    const offset = Number.parseInt(searchParams.get('offset') || '0')

    const { data: event, error: eventError } = await getEventIdBySlug(slug)

    if (!event || eventError) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 },
      )
    }

    // Get current user session to check likes
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    const currentUserId = session?.user?.id ? Number.parseInt(session.user.id) : null

    // Fetch root comments with user info and recent replies
    const { data: comments, error } = await supabaseAdmin
      .from('v_comments_with_user')
      .select('*')
      .eq('event_id', event.id)
      .is('parent_comment_id', null) // Only root comments
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 },
      )
    }

    // If user is logged in, check which comments they've liked
    let commentsWithLikeStatus = comments || []
    if (currentUserId && comments?.length) {
      const commentIds = comments.map(c => c.id)
      const replyIds = comments.flatMap(c => c.recent_replies?.map((r: any) => r.id) || [])
      const allIds = [...commentIds, ...replyIds]

      if (allIds.length > 0) {
        const { data: userLikes } = await supabaseAdmin
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', currentUserId)
          .in('comment_id', allIds)

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
  catch (error) {
    console.error('Error in comments API:', error)
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
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
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
        { error: 'Comment is too long (max 2000 characters)' },
        { status: 400 },
      )
    }

    // First, get the event ID from slug
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 },
      )
    }

    // Insert new comment
    const { data: newComment, error: insertError } = await supabaseAdmin
      .from('comments')
      .insert({
        event_id: event.id,
        user_id: Number.parseInt(session.user.id),
        content: content.trim(),
        parent_comment_id: parent_comment_id || null,
      })
      .select(`
        id,
        content,
        user_id,
        likes_count,
        replies_count,
        created_at,
        users!inner(username, image, address)
      `)
      .single()

    if (insertError) {
      console.error('Error inserting comment:', insertError)
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 },
      )
    }

    // Format response to match expected interface
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
      user_has_liked: false, // New comment, user hasn't liked it yet
      recent_replies: [],
    }

    return NextResponse.json(formattedComment)
  }
  catch (error) {
    console.error('Error in comment creation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
