import { NextResponse } from 'next/server'
import { NotificationModel } from '@/lib/db/notifications'
import { UserModel } from '@/lib/db/users'

export async function GET() {
  try {
    const user = await UserModel.getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthenticated.' },
        { status: 401 },
      )
    }

    const { data: notifications, error } = await NotificationModel.getByUserId(user.id)

    if (error) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      )
    }

    return NextResponse.json(notifications)
  }
  catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
