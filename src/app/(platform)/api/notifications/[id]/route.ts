import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { NotificationRepository } from '@/lib/db/notification'
import { UserRepository } from '@/lib/db/user'

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await UserRepository.getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthenticated.' },
        { status: 401 },
      )
    }

    const { id } = await params
    const { error } = await NotificationRepository.deleteById(id, user.id)

    if (error) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  }
  catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
