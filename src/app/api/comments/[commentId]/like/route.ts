import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> },
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

    const { commentId } = await params
    const userId = Number.parseInt(session.user.id)

    // Check if user already liked this comment
    const { data: existingLike } = await supabaseAdmin
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single()

    if (existingLike) {
      // Unlike - remove the like
      const { error: deleteError } = await supabaseAdmin
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId)

      if (deleteError) {
        console.error('Error removing like:', deleteError)
        return NextResponse.json(
          { error: 'Failed to unlike comment' },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        action: 'unliked',
        message: 'Comment unliked successfully',
      })
    }
    else {
      // Like - add new like
      const { error: insertError } = await supabaseAdmin
        .from('comment_likes')
        .insert({
          comment_id: Number.parseInt(commentId),
          user_id: userId,
        })

      if (insertError) {
        console.error('Error adding like:', insertError)
        return NextResponse.json(
          { error: 'Failed to like comment' },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        action: 'liked',
        message: 'Comment liked successfully',
      })
    }
  }
  catch (error) {
    console.error('Error in like API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> },
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

    const { commentId } = await params
    const userId = Number.parseInt(session.user.id)

    // Remove like
    const { error } = await supabaseAdmin
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing like:', error)
      return NextResponse.json(
        { error: 'Failed to unlike comment' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Comment unliked successfully',
    })
  }
  catch (error) {
    console.error('Error in unlike API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
