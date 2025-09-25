import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { NotificationModel } from '@/lib/db/notifications'
import { UserModel } from '@/lib/db/users'

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await UserModel.getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const { id } = await params
    const notificationId = id
    if (!notificationId) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 },
      )
    }

    const { error } = await NotificationModel.deleteById(notificationId, user.id)

    if (error) {
      if (error === 'Notification not found') {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 },
        )
      }

      if (error === 'Unauthorized to delete this notification') {
        return NextResponse.json(
          { error: 'Forbidden: Cannot delete another user\'s notification' },
          { status: 403 },
        )
      }

      return NextResponse.json(
        { error },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  }
  catch (err) {
    console.error('Unexpected error in DELETE /api/notifications/[id]:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
