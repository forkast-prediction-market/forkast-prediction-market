import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

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

    // First check if the comment belongs to the user
    const { data: comment, error: fetchError } = await supabaseAdmin
      .from('comments')
      .select('user_id, is_deleted')
      .eq('id', commentId)
      .single()

    if (fetchError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 },
      )
    }

    if (comment.user_id !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 },
      )
    }

    if (comment.is_deleted) {
      return NextResponse.json(
        { error: 'Comment already deleted' },
        { status: 400 },
      )
    }

    // Soft delete the comment
    const { error: deleteError } = await supabaseAdmin
      .from('comments')
      .update({
        is_deleted: true,
        content: '[deleted]',
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)

    if (deleteError) {
      console.error('Error soft deleting comment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    })
  }
  catch (error) {
    console.error('Error in delete comment API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
