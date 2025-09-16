import { NextResponse } from 'next/server'
import { EventModel } from '@/lib/db/events'
import { UserModel } from '@/lib/db/users'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tag = searchParams.get('tag') || 'trending'
  const search = searchParams.get('search') || ''
  const bookmarked = searchParams.get('bookmarked') === 'true'
  const offset = Number.parseInt(searchParams.get('offset') || '0', 10)
  const clampedOffset = Number.isNaN(offset) ? 0 : Math.max(0, offset)

  const user = await UserModel.getCurrentUser()
  const userId = user?.id

  try {
    const { data: events, error } = await EventModel.listEvents({
      tag,
      search,
      userId,
      bookmarked,
      offset: clampedOffset,
    })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch more events.' },
        { status: 500 },
      )
    }

    return NextResponse.json(events)
  }
  catch {
    return NextResponse.json(
      { error: 'Failed to fetch more events.' },
      { status: 500 },
    )
  }
}
