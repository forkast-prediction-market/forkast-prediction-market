import { NextResponse } from 'next/server'
import { NotificationRepository } from '@/lib/db/queries/notification'
import { UserRepository } from '@/lib/db/queries/user'

export async function GET() {
  try {
    const user = await UserRepository.getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthenticated.' },
        { status: 401 },
      )
    }

    const { data: notifications, error } = await NotificationRepository.getByUserId(user.id)

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
